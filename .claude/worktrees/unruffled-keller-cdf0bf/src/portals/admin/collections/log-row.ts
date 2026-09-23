import type { ActivityLog } from '../../../api/logs/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'
import { when } from '../../../features/collections/when.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/**
 * The presets the range filter offers. The endpoint takes `from` and `to` as
 * dates, and what people actually want of an audit log is "recently" — so the
 * filter offers spans rather than a pair of calendars.
 */
export const RANGES = ['Today', 'Last 7 days', 'Last 30 days', 'This year'] as const

export type Range = { from?: string; to?: string }

/** `YYYY-MM-DD` in the reader's own timezone, which is the school's. */
function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function daysBefore(today: Date, days: number): Date {
  const start = new Date(today)
  start.setDate(start.getDate() - days)
  return start
}

/**
 * A preset as the two dates the endpoint takes, both bounds inclusive. An
 * unset or unrecognised preset is no range at all rather than a guess, so the
 * log opens on everything it holds.
 */
export function logRange(preset: string | undefined, today: Date): Range {
  const to = isoDay(today)
  switch (preset) {
    case 'Today':
      return { from: to, to }
    // Inclusive of both ends, so "last 7 days" is today and the six before it.
    case 'Last 7 days':
      return { from: isoDay(daysBefore(today, 6)), to }
    case 'Last 30 days':
      return { from: isoDay(daysBefore(today, 29)), to }
    case 'This year':
      return { from: `${today.getFullYear()}-01-01`, to }
    default:
      return {}
  }
}

/**
 * Who acted, as the log can name them: their name, else the login they signed
 * in with, else the id alone. All three go once the account is deleted — which
 * is exactly when an audit entry matters most — so the column says so plainly
 * rather than leaving the line unattributed.
 */
export function logAuthor(log: ActivityLog): string {
  return (
    log.user?.trim() ||
    log.username?.trim() ||
    (log.user_id ? `User ${log.user_id}` : 'Deleted account')
  )
}

/**
 * One line of the audit trail.
 */
export function logRow(log: ActivityLog): Row {
  return {
    id: String(log.id),
    when: when(log.timestamp, true),
    user: logAuthor(log),
    type: text(log.type),
    action: text(log.description || log.title),
    ip: text(log.ip),

    // Read by the record panel rather than the table.
    title: text(log.title),
    description: text(log.description),
  }
}
