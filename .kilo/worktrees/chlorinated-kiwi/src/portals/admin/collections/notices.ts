import type { AllNoticesEnvelope, Notice, NoticeBody } from '@/api/notifications/types'
import { heldDocument, type Document } from '@/db/collection'
import { refBoard } from '@/db/collections/reference'
import { enqueue } from '@/db/drain'
import { SET, WRITE } from '@/db/ids'
import { DRAWN_STATES, isLocalKey, newLocalKey, type OutboxOp } from '@/db/outbox'
import { outbox } from '@/db/store'
import { pageRows } from '@/features/collections/api'
import { localFirst } from '@/features/collections/local-first'
import { newestFirst } from '@/features/collections/order'
import type { CollectionDef, Row } from '@/features/collections/types'
import { noticeBody } from './notice-body'
import { noticeRow } from './notice-row'

/**
 * The school notice board, as the office writes it.
 *
 * `GET /notifications` takes a `limit` and answers with a `pagination` block,
 * but the office's whole board is a page — a school posts notices in the tens
 * — so it is asked for once and searched and paged here. That also means the
 * search box matches every column rather than the one field a query parameter
 * would narrow; the endpoint has no `q`.
 *
 * **The record is read out of the list, never from `GET /notifications/{id}`.**
 * That endpoint marks the notice read and counts a view every single time it
 * is asked — twice from one account counts two — so opening the office's own
 * record page would inflate the tally the office is reading. The list carries
 * every field the record shows anyway.
 */
/**
 * Newest first, which the board has to state now that it is read out of a keyed
 * collection: the endpoint's own order does not survive being stored.
 */
const posted = (notices: readonly Notice[]) =>
  newestFirst(notices, (notice) => notice.datecreated)

const board = async (): Promise<Notice[]> =>
  (await heldDocument(refBoard))?.notifications ?? []

const rows = () => board().then((notices) => posted(notices).map(noticeRow))

const countBy = (predicate?: (notice: Notice) => boolean) => async () => {
  const notices = await board()
  return predicate ? notices.filter(predicate).length : notices.length
}

/**
 * Notices written on this device that the school has not seen yet.
 *
 * Read out of the queue rather than written into the set: an optimistic write
 * is wiped by the next sync, and a board refetches often. Each carries the
 * `local:` key the device gave it, which is what marks it unsynced — and so
 * read-only — until the school issues an id of its own; see `unsynced.ts`.
 *
 * Only the posts. A queued edit changes a row the board already shows, so it
 * needs no ghost beside it, and a queued delete leaves the row where it is
 * until the school agrees it is gone.
 */
function queuedNotices(ops: readonly OutboxOp[]): Row[] {
  return ops
    .filter(
      (op) =>
        op.handler === WRITE.postNotice &&
        DRAWN_STATES.includes(op.state) &&
        typeof op.targetKey === 'string',
    )
    // Newest first, like the board itself.
    .sort((one, two) => two.seq - one.seq)
    .map((op) => {
      const body = op.payload as NoticeBody
      const row = noticeRow({
        id: 0,
        title: body.title ?? null,
        message: body.message ?? null,
        datecreated: new Date(op.createdAt).toISOString(),
        user_id: null,
        posted_by: null,
        recipients: body.recipients ?? null,
        status: body.status ?? 'active',
        viewcount: 0,
        is_read: false,
        is_automatic: false,
        // The school works out a notice's reach from the class it names; until
        // it has, the row says what the office chose and nothing more.
        scope: null,
        class_name: null,
      })
      // The device's own key rather than the nought above: it is what tells the
      // register, the record panel and the delete button that this row is not
      // the school's yet.
      return { ...row, id: op.targetKey as string }
    })
}

export const notices: CollectionDef = {
  id: 'notices',
  path: '/admin/notices',
  kicker: 'School',
  title: 'Notice board',
  description:
    'What the school has posted, and who it reached. A notice appears on its audience’s own notifications the moment it is saved.',
  action: 'Post notice',
  searchHint: 'Search title, message or audience',
  footer: 'Notice board',
  emptyTitle: 'Nothing has been posted',
  emptyBody: 'Post a notice and it appears on every reader it is addressed to.',
  noun: 'notice',
  nameKey: 'title',
  counts: [
    { label: 'Notices', count: countBy() },
    { label: 'Live', count: countBy((notice) => notice.status === 'active') },
    {
      label: 'Raised by an assignment',
      count: countBy((notice) => notice.is_automatic === true),
    },
  ],
  columns: [
    { key: 'title', label: 'Notice', cardRole: 'title' },
    { key: 'audience', label: 'Audience', cardRole: 'subtitle' },
    { key: 'reach', label: 'Reach' },
    { key: 'posted', label: 'Posted' },
    { key: 'views', label: 'Views', align: 'right' },
    { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'title', label: 'Notice' },
    // Written in the editor, so it is read back through it — the record panel
    // draws the notice the way the office laid it out, rather than showing the
    // tags to whoever opens the row.
    { key: 'message', label: 'Message', rich: true },
    { key: 'audience', label: 'Audience' },
    { key: 'reach', label: 'Reach' },
    { key: 'status', label: 'Status' },
    { key: 'posted', label: 'Posted' },
    { key: 'postedBy', label: 'Posted by' },
    { key: 'raised', label: 'Raised' },
    // A hit rather than a reader: the same person opening it twice counts two.
    { key: 'views', label: 'Times opened' },
  ],
  collection: localFirst({
    // One document — the board and its audience catalogue — not a set of
    // rows; the register reads the list field out of it.
    entities: refBoard,
    rows: (docs: Document<AllNoticesEnvelope>[]) =>
      posted(docs[0]?.doc.notifications ?? []).map(noticeRow),
    queued: queuedNotices,
  }),
  source: async (params) => pageRows(await rows(), params),
  /**
   * A notice still in the queue is found in the queue, not in the set: the
   * school has never heard of it, so nothing it holds could match. Without
   * this, opening the row somebody had just written answered "record not
   * found", which is true of the school and a lie about their work.
   */
  record: async (recordId) =>
    isLocalKey(recordId)
      ? queuedNotices(outbox().toArray).find((row) => row.id === recordId)
      : (await rows()).find((row) => row.id === String(recordId)),
  /**
   * Posted from the device and sent afterwards.
   *
   * A notice is written where the office is, which is not always where the
   * signal is. What is written is kept, appears on the board straight away as
   * waiting, and goes when there is somewhere to send it.
   */
  queue: (values, recordId) => {
    const body = noticeBody(values)
    const named = body.title?.trim() || 'Untitled notice'

    if (recordId) {
      return enqueue({
        handler: WRITE.editNotice,
        payload: { id: recordId, body },
        collectionId: SET.refBoard,
        targetKey: recordId,
        toast: { success: 'Notice updated' },
        label: `Notice “${named}”`,
      })
    }

    return enqueue({
      handler: WRITE.postNotice,
      payload: body,
      collectionId: SET.refBoard,
      // The school issues the id, so the device names it in the meantime — and
      // that name is what keeps the row read-only until the school answers.
      targetKey: newLocalKey(),
      toast: { success: 'Notice posted' },
      label: `Notice “${named}”`,
    })
  },
  queueRemove: (recordId) =>
    enqueue({
      handler: WRITE.removeNotice,
      payload: recordId,
      collectionId: SET.refBoard,
      targetKey: recordId,
      toast: { success: 'Notice deleted' },
      label: 'A notice',
    }),
  removeBody: (row) =>
    `Deleting “${row.title}” takes it off every reader's notifications, along with the record of who had opened it. There is no undo.`,
  form: [
    {
      title: 'Notice',
      fields: [
        {
          key: 'title',
          label: 'Title',
          required: true,
          wide: true,
          placeholder: 'Mid-term break',
          hint: 'What a reader sees before they open it. Keep it to a line.',
        },
        {
          key: 'message',
          label: 'Message',
          required: true,
          rich: true,
          placeholder: 'School closes on Friday and reopens on the 14th.',
        },
      ],
    },
    {
      title: 'Who it reaches',
      fields: [
        {
          key: 'recipients',
          label: 'Audience',
          required: true,
          optionsFrom: 'audiences',
          hint: 'Read from the board itself, so these are exactly the audiences the school will accept.',
        },
        {
          key: 'department_id',
          label: 'Class',
          optionsFrom: 'classes',
          hint: 'Leave empty to post to the whole school. Naming a class limits the notice to it.',
        },
        {
          key: 'status',
          label: 'Status',
          options: ['active', 'inactive'],
          hint: 'Anything other than active takes the notice off readers’ lists without deleting it.',
        },
        {
          key: 'expiresat',
          label: 'Expires',
          date: true,
          hint: 'Optional. After this the notice stops appearing. The board never sends this back, so it cannot be read off a saved notice.',
        },
        {
          key: 'link',
          label: 'Link',
          wide: true,
          placeholder: 'https://…',
          hint: 'Optional, and write-only: the board accepts one and no read has ever returned it.',
        },
      ],
    },
  ],
}
