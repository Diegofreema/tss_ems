import { BLANK } from './blank.ts'
import { formatDate } from '../../lib/format.ts'

/**
 * A timestamp as the screens show it — the day alone, or the day with the
 * time on it.
 *
 * This API writes dates three ways: an ISO timestamp carrying the school's own
 * offset (`2026-08-27T09:23:47+01:00`), a bare one with no zone at all
 * (`payday`, `2026-08-27 09:23:47`), and `24 Oct 2022 19:02 pm` on rows raised
 * years ago. The third is already readable, so a date that will not parse is
 * shown as it was sent rather than as "Invalid Date".
 *
 * A bare timestamp is read as the reader's own clock, because it carries the
 * same wall clock as the ISO ones beside it — `receipt.issued_at` is
 * `09:23:47+01:00` against a `payday` of `09:23:47`. Both are the school's
 * time, and reading either as UTC would put the same payment an hour out from
 * itself.
 */
export function when(value: string | null | undefined, withTime = false): string {
  if (!value) return BLANK
  const at = new Date(value)
  if (Number.isNaN(at.getTime())) return value
  if (!withTime) return formatDate(at)
  return at.toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * A timestamp read as the school's own clock.
 *
 * The same wall clock reaches the portal stamped three ways — `+01:00` on most
 * endpoints, `+00:00` on the household's invoices, and with no zone at all on
 * an assignment's closing time. It is the school's time in every case, so the
 * offset is dropped rather than believed: taken at face value it would move an
 * invoice raised in the last hour of a day onto the next one, and shut an assignment
 * an hour early.
 */
export function schoolTime(stamp: string | null | undefined): string | null | undefined {
  return stamp?.replace(/(?:Z|[+-]\d{2}:?\d{2})$/, '') ?? stamp
}

/**
 * The same stamp as milliseconds, or null where it will not parse.
 *
 * Everything that compares two of these — is the assignment still open, was this
 * filed today — needs a number rather than a string, and needs the school's
 * clock rather than the reader's guess at it.
 */
export function schoolMillis(stamp: string | null | undefined): number | null {
  if (!stamp) return null
  const parsed = new Date(schoolTime(stamp) ?? '').getTime()
  return Number.isNaN(parsed) ? null : parsed
}
