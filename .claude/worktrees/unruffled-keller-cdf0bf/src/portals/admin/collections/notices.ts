import { noticesService } from '@/api/notifications/service'
import type { Notice } from '@/api/notifications/types'
import { pageRows } from '@/features/collections/api'
import type { CollectionDef } from '@/features/collections/types'
import { queryClient } from '@/lib/query-client'
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
const ALL = 200

const board = (): Promise<Notice[]> =>
  queryClient
    .ensureQueryData({
      queryKey: ['notices', 'board'],
      queryFn: () => noticesService.all({ limit: ALL }),
    })
    .then((page) => page.notifications ?? [])

const rows = () => board().then((notices) => notices.map(noticeRow))

const countBy = (predicate?: (notice: Notice) => boolean) => async () => {
  const notices = await board()
  return predicate ? notices.filter(predicate).length : notices.length
}

/** Anything the board changes has to reach the readers' own lists too. */
const refresh = () => queryClient.invalidateQueries({ queryKey: ['notices'] })

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
    { key: 'message', label: 'Message' },
    { key: 'audience', label: 'Audience' },
    { key: 'reach', label: 'Reach' },
    { key: 'status', label: 'Status' },
    { key: 'posted', label: 'Posted' },
    { key: 'postedBy', label: 'Posted by' },
    { key: 'raised', label: 'Raised' },
    // A hit rather than a reader: the same person opening it twice counts two.
    { key: 'views', label: 'Times opened' },
  ],
  source: async (params) => pageRows(await rows(), params),
  record: async (recordId) => (await rows()).find((row) => row.id === String(recordId)),
  save: async (values, recordId) => {
    const saved = recordId
      ? await noticesService.edit(recordId, noticeBody(values))
      : await noticesService.post(noticeBody(values))
    await refresh()
    return saved
  },
  remove: async (recordId) => {
    const gone = await noticesService.remove(recordId)
    await refresh()
    return gone
  },
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
