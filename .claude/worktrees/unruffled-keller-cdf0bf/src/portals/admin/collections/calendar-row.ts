import type { CalendarRecord } from '../../../api/calendar/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'
import { formatDate } from '../../../lib/format.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** An ISO timestamp as the design writes dates. Anything else is left alone. */
function asDate(value: string | null | undefined): string {
  if (!value) return BLANK
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : formatDate(date)
}

/**
 * A count the list endpoint does not send reads blank, never as zero — the
 * register has not been told, which is a different thing from being told none.
 */
function tally(record: CalendarRecord, key: string): string {
  const held = record.dependencies?.[key]
  return typeof held === 'number' ? String(held) : BLANK
}

/**
 * The only state either register knows. Sessions and terms carry no dates and
 * no open/closed flag — the school is either in one or it is not, and that is
 * `is_current`. Anything more would be invented.
 */
export function state(record: CalendarRecord): string {
  return record.is_current ? 'Current' : 'Not current'
}

/**
 * One academic session — 2024/2025. Everything the school records is stamped
 * with whichever session was current at the time, which is what the counts on
 * the record are: what would lose its year if the session went.
 */
export function sessionRow(session: CalendarRecord): Row {
  return {
    id: String(session.id),
    name: text(session.name),
    state: state(session),
    opened: asDate(session.createdate),
    openedBy: text(session.created_by),

    // Detail only; the list sends the row alone.
    invoices: tally(session, 'invoices'),
    payments: tally(session, 'transactions'),
    results: tally(session, 'results'),
    registrations: tally(session, 'courseregistrations'),
  }
}

/** One term. The API's table is `semesters`; a school calls them terms. */
export function termRow(term: CalendarRecord): Row {
  return {
    id: String(term.id),
    name: text(term.name),
    state: state(term),

    // Detail only; the list sends the row alone.
    results: tally(term, 'results'),
    tests: tally(term, 'tests'),
    registrations: tally(term, 'course_registrations'),
    assignments: tally(term, 'course_assignments'),
  }
}

/** "8 invoices, 3 payments and 1 result", or nothing at all. */
function held(pairs: [string | undefined, string, string][]): string {
  const named = pairs
    .map(([value, one, many]) => {
      const count = Number(value)
      return count > 0 ? `${count} ${count === 1 ? one : many}` : ''
    })
    .filter(Boolean)

  if (named.length < 2) return named[0] ?? ''
  return `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`
}

/**
 * What deleting a session would strand. Two separate refusals live here: the
 * API will not delete the current session at all, and it will not delete one
 * with rows filed under it. Both belong in the dialog, before the button is
 * pressed, rather than in a toast after it.
 */
export function sessionDeleteBody(row: Row | undefined): string {
  if (row?.state === 'Current') {
    return 'This is the session the school is in, and it cannot be deleted while it is. Make another session current first.'
  }
  const inside = held([
    [row?.invoices, 'invoice', 'invoices'],
    [row?.payments, 'payment', 'payments'],
    [row?.results, 'result', 'results'],
    [row?.registrations, 'registration', 'registrations'],
  ])
  if (!inside) {
    return 'Nothing is filed under this session, so removing it changes nothing else.'
  }
  return `This session holds ${inside}. The register will refuse to delete it while they are filed under it — they would be left with no year to belong to.`
}

/** The same two refusals, over what a term holds. */
export function termDeleteBody(row: Row | undefined): string {
  if (row?.state === 'Current') {
    return 'This is the term the school is in, and it cannot be deleted while it is. Make another term current first.'
  }
  const inside = held([
    [row?.results, 'result', 'results'],
    [row?.tests, 'test', 'tests'],
    [row?.registrations, 'registration', 'registrations'],
    [row?.assignments, 'assignment', 'assignments'],
  ])
  if (!inside) {
    return 'Nothing is filed under this term, so removing it changes nothing else.'
  }
  return `This term holds ${inside}. The register will refuse to delete it while they are filed under it — they would be left with no term to belong to.`
}

/**
 * Making a session or a term current, as the row offers it. The one already
 * current gets no button rather than one that would change nothing.
 *
 * The definition supplies `run`, because the endpoint that does this is not on
 * the sessions or terms resource at all — it is a school setting, and both
 * registers only read the answer.
 */
export function currentAction(noun: 'session' | 'term') {
  return {
    label: (row: Row) => (row.state === 'Current' ? undefined : 'Make current'),
    title: () => `Make this the current ${noun}?`,
    cta: () => 'Make it current',
    confirm: (row: Row) =>
      `Everything the school records from now on is filed under ${row.name} — invoices, results, attendance. What is already filed under the ${noun} it is leaving stays exactly where it is.`,
    done: (row: Row) => `${row.name} is now the current ${noun}`,
  }
}
