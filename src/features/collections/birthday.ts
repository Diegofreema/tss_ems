import { BLANK } from './blank.ts'
import { formatDate } from '../../lib/format.ts'

/**
 * A stored birthday as the date picker reads it.
 *
 * **Two spellings reach this, and both have to be read.** The school's older
 * records hold DD/MM/YYYY; a student enrolled through this app's own form is
 * stored as YYYY-MM-DD, because that is what `studentBody` sends. Reading only
 * the first left the edit form's picker empty for every student the office had
 * created itself — the birthday was on the record and on the panel beside it,
 * and the field meant to hold it opened blank.
 *
 * Neither is handed to `new Date`: DD/MM/YYYY is read as the wrong month for
 * any day of twelve or under, and a bare YYYY-MM-DD is read as UTC, which
 * moves the day west of Greenwich. Both are taken apart instead.
 *
 * Anything else is left for the picker to ignore, which opens it empty rather
 * than on a date nobody chose.
 */
export function isoBirthday(stored: string | null | undefined): string {
  const value = stored?.trim()
  if (!value) return ''

  // What this app's form writes, with or without a time hung off the end.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const parts = value.split('/')
  if (parts.length !== 3) return ''
  const [day, month, year] = parts
  if (!day || !month || !year || year.length !== 4) return ''
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/**
 * A date chosen in the calendar field, as the API takes it.
 *
 * The inverse of `isoBirthday`, and here beside it so the two halves of the
 * round trip are read together: the picker hands back a `Date`, every endpoint
 * that stores a birthday wants `YYYY-MM-DD`, and the parts are taken off the
 * calendar rather than off `toISOString`, which would move the day west of
 * Greenwich onto the one before.
 */
export function isoDate(value: unknown): string | undefined {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return undefined
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
}

/**
 * A birthday as the design writes dates, whichever way it was stored.
 *
 * Shared rather than per-portal: the office and the teacher read the same
 * student off two endpoints that spell the date differently, and a mapper that
 * knew about only one of them showed a raw `2023-04-07` on the panel.
 *
 * Built off the calendar's own year, month and day rather than through
 * `new Date(value)`, which reads a bare YYYY-MM-DD as UTC and would print the
 * day before for anyone reading west of Greenwich.
 */
export function birthday(stored: string | null | undefined): string {
  const iso = isoBirthday(stored)
  if (!iso) return stored?.trim() || BLANK
  const [year, month, day] = iso.split('-').map(Number)
  return formatDate(new Date(year, month - 1, day))
}
