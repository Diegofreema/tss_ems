import { sessionsService, termsService } from '@/api/calendar/service'
import type { CalendarRecord } from '@/api/calendar/types'
import { heldRows } from '@/db/collection'
import { refSessions, refTerms } from '@/db/collections/reference'
import { enqueue } from '@/db/drain'
import { SET, WRITE } from '@/db/ids'
import { DRAWN_STATES, isLocalKey, newLocalKey, type OutboxOp } from '@/db/outbox'
import { outbox } from '@/db/store'
import { localFirst } from '@/features/collections/local-first'
import type { CollectionDef, Row } from '@/features/collections/types'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import {
  currentAction,
  sessionDeleteBody,
  sessionRow,
  termDeleteBody,
  termRow,
} from './calendar-row'
import { withPendingCurrent } from './pending-state'

/**
 * Newest first for sessions — a school asks about this year or the last — and
 * oldest first for terms, which run First, Second, Third. Stated rather than
 * inherited: a keyed collection hands its rows back in key order however the
 * endpoint sent them.
 */
const newestSession = (rows: readonly CalendarRecord[]) =>
  [...rows].sort((one, two) => two.id - one.id)

const inTermOrder = (rows: readonly CalendarRecord[]) =>
  [...rows].sort((one, two) => one.id - two.id)

/**
 * Sessions or terms written on this device that the school has not seen.
 *
 * Each carries the `local:` key the device gave it, which is what keeps it
 * read-only — and, here, keeps it from being made the school's current session
 * before the school knows it exists.
 */
function queuedCalendar(ops: readonly OutboxOp[], handler: string): Row[] {
  return ops
    .filter(
      (op) =>
        op.handler === handler &&
        DRAWN_STATES.includes(op.state) &&
        typeof op.targetKey === 'string',
    )
    .sort((one, two) => two.seq - one.seq)
    .map((op) => ({
      id: op.targetKey as string,
      name: String((op.payload as { name?: string }).name ?? '').trim(),
      state: 'Waiting to send',
      opened: '—',
      openedBy: '—',
      invoices: '—',
      payments: '—',
      results: '—',
      registrations: '—',
    }))
}

/** One name, which is all a session or a term is. */
const calendarBody = (values: Record<string, unknown>) => ({
  name: String(values.name ?? '').trim(),
})

/**
 * Sessions and terms are two registers, not one list with a type column: a
 * school opens a session every year and never touches its three terms again,
 * and the two are deleted, renamed and made current entirely separately. Each
 * page carries a button to the other.
 *
 * Neither carries dates. The API keeps a session as a name and a flag, and the
 * term the school is in is a school setting — so the only dates anywhere near
 * this are `current_term_ends` and `next_term_begins`, which live in Settings.
 */
export const sessions: CollectionDef = {
  id: 'calendar',
  path: '/admin/calendar',
  kicker: 'Academics',
  title: 'Academic sessions',
  description:
    'The school years everything is filed under. One is current at a time, and every invoice, result and registration is stamped with whichever it was.',
  action: 'Create session',
  searchHint: 'Search session',
  footer: 'Session register',
  emptyTitle: 'No sessions yet',
  emptyBody:
    'Nothing can be recorded until the school has a session — an invoice, a result and a registration are each filed under one.',
  noun: 'session',
  nameKey: 'name',
  secondaryTo: { to: '/admin/terms', label: 'Terms' },
  counts: [
    // Counted off the device, like the register below, so the figures above a
    // list and the list itself can never disagree — and so they still read
    // with no connection.
    { label: 'Sessions', count: async () => (await heldRows(refSessions)).length },
    { label: 'Terms', count: async () => (await heldRows(refTerms)).length },
  ],
  columns: [
    { key: 'name', label: 'Session', cardRole: 'title' },
    { key: 'state', label: 'State', tag: true, cardRole: 'tag' },
    { key: 'openedBy', label: 'Opened by', cardRole: 'subtitle' },
    { key: 'opened', label: 'Opened' },
  ],
  detail: [
    { key: 'name', label: 'Session' },
    { key: 'state', label: 'State' },
    { key: 'invoices', label: 'Invoices raised' },
    { key: 'payments', label: 'Payments taken' },
    { key: 'results', label: 'Results recorded' },
    { key: 'registrations', label: 'Subject registrations' },
    { key: 'openedBy', label: 'Opened by' },
    { key: 'opened', label: 'Opened' },
  ],
  // The endpoint that changes this is a school setting rather than anything on
  // the sessions resource — both registers only read `is_current`.
  /*
   * Through the queue. Every unfiltered screen is about the current session, so
   * the whole cache goes rather than being picked over — including the header's
   * own chip — but that happens where the write actually lands, in the handler.
   */
  rowAction: {
    ...currentAction('session'),
    queueRun: (row) =>
      enqueue({
        handler: WRITE.setCurrentSession,
        payload: Number(row.id),
        collectionId: SET.refSessions,
        targetKey: row.id,
        toast: { success: `${row.name} is now the current session` },
        label: `Current session — ${row.name}`,
      }),
  },
  // Read off the device: a school has years in the tens, and this is the same
  // set every form's session dropdown offers.
  collection: localFirst({
    entities: refSessions,
    rows: (all) => newestSession(all).map(sessionRow),
    queued: (ops) => queuedCalendar(ops, WRITE.createSession),
    // A queued "make current" moves the word onto the row the office chose, so
    // the button is not a button that appears to do nothing.
    overlay: (rows, ops) => withPendingCurrent(rows, ops, WRITE.setCurrentSession),
  }),
  source: async ({ page, q }) => {
    const { items, pagination } = await sessionsService.list({ page, limit: PAGE_SIZE, q })
    return { items: items.map(sessionRow), pagination }
  },
  /*
   * The register's own row for one still in the queue; the school's own detail
   * otherwise. The detail carries what the list does not — how many invoices,
   * results and registrations are filed under the year — so it is still asked
   * for where there is a year to ask about.
   */
  record: async (recordId) =>
    isLocalKey(recordId)
      ? queuedCalendar(outbox().toArray, WRITE.createSession).find(
          (row) => row.id === recordId,
        )
      : sessionsService.get(recordId).then(sessionRow),
  queue: (values, recordId) => {
    const body = calendarBody(values)
    if (recordId) {
      return enqueue({
        handler: WRITE.renameSession,
        payload: { id: recordId, body },
        collectionId: SET.refSessions,
        targetKey: recordId,
        toast: { success: 'Session updated' },
        label: `Session “${body.name}”`,
      })
    }
    return enqueue({
      handler: WRITE.createSession,
      payload: body,
      collectionId: SET.refSessions,
      targetKey: newLocalKey(),
      toast: { success: 'Session created' },
      label: `Session “${body.name}”`,
    })
  },
  // Never forced. Forcing leaves invoices, results and registrations pointing
  // at a year that is gone, and the API's refusal is the right answer.
  queueRemove: (recordId) =>
    enqueue({
      handler: WRITE.removeSession,
      payload: recordId,
      collectionId: SET.refSessions,
      targetKey: recordId,
      toast: { success: 'Session deleted' },
      label: 'A session',
    }),
  removeBody: sessionDeleteBody,
  form: [
    {
      title: 'Session',
      fields: [
        {
          key: 'name',
          label: 'Name',
          required: true,
          wide: true,
          placeholder: '2025/2026',
          hint: 'How the year reads on every invoice, result and report. It must be unique, and a session is only ever made current from the register.',
        },
      ],
    },
  ],
}

export const terms: CollectionDef = {
  id: 'terms',
  path: '/admin/terms',
  // Six fields and no sub-tables: the record opens over the register.
  modal: true,
  kicker: 'Academics',
  title: 'Terms',
  description:
    'The terms a session is divided into. One is current at a time, and results, tests and registrations are filed under whichever it was.',
  action: 'Create term',
  searchHint: 'Search term',
  footer: 'Term register',
  emptyTitle: 'No terms yet',
  emptyBody: 'A school needs at least one term before results or tests can be recorded against it.',
  noun: 'term',
  nameKey: 'name',
  secondaryTo: { to: '/admin/calendar', label: 'Sessions' },
  counts: [
    // Off the device; see the note on the sessions register above.
    { label: 'Terms', count: async () => (await heldRows(refTerms)).length },
    { label: 'Sessions', count: async () => (await heldRows(refSessions)).length },
  ],
  columns: [
    { key: 'name', label: 'Term', cardRole: 'title' },
    { key: 'state', label: 'State', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'name', label: 'Term' },
    { key: 'state', label: 'State' },
    { key: 'results', label: 'Results recorded' },
    { key: 'tests', label: 'Tests set' },
    { key: 'registrations', label: 'Subject registrations' },
    { key: 'assignments', label: 'Subject assignments' },
  ],
  rowAction: {
    ...currentAction('term'),
    queueRun: (row) =>
      enqueue({
        handler: WRITE.setCurrentTerm,
        payload: Number(row.id),
        collectionId: SET.refTerms,
        targetKey: row.id,
        toast: { success: `${row.name} is now the current term` },
        label: `Current term — ${row.name}`,
      }),
  },
  // Read off the device, in the order a school says them: First, Second, Third.
  collection: localFirst({
    entities: refTerms,
    rows: (all) => inTermOrder(all).map(termRow),
    queued: (ops) => queuedCalendar(ops, WRITE.createTerm),
    overlay: (rows, ops) => withPendingCurrent(rows, ops, WRITE.setCurrentTerm),
  }),
  source: async ({ page, q }) => {
    const { items, pagination } = await termsService.list({ page, limit: PAGE_SIZE, q })
    return { items: items.map(termRow), pagination }
  },
  record: async (recordId) =>
    isLocalKey(recordId)
      ? queuedCalendar(outbox().toArray, WRITE.createTerm).find((row) => row.id === recordId)
      : termsService.get(recordId).then(termRow),
  queue: (values, recordId) => {
    const body = calendarBody(values)
    if (recordId) {
      return enqueue({
        handler: WRITE.renameTerm,
        payload: { id: recordId, body },
        collectionId: SET.refTerms,
        targetKey: recordId,
        toast: { success: 'Term updated' },
        label: `Term “${body.name}”`,
      })
    }
    return enqueue({
      handler: WRITE.createTerm,
      payload: body,
      collectionId: SET.refTerms,
      targetKey: newLocalKey(),
      toast: { success: 'Term created' },
      label: `Term “${body.name}”`,
    })
  },
  queueRemove: (recordId) =>
    enqueue({
      handler: WRITE.removeTerm,
      payload: recordId,
      collectionId: SET.refTerms,
      targetKey: recordId,
      toast: { success: 'Term deleted' },
      label: 'A term',
    }),
  removeBody: termDeleteBody,
  form: [
    {
      title: 'Term',
      fields: [
        {
          key: 'name',
          label: 'Name',
          required: true,
          wide: true,
          placeholder: 'First Term',
          hint: 'Most schools need only the three they already have. A term is only ever made current from the register.',
        },
      ],
    },
  ],
}
