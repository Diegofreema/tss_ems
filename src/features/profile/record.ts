import { formatDate } from '../../lib/format.ts'
import { BLANK } from '../collections/blank.ts'

/**
 * Reading a person's own record onto the account page.
 *
 * Each portal fills the page from a different endpoint, but every one of them
 * has the same four things to do with what comes back: a name kept in parts, a
 * square with two letters in it, a timestamp, and a box the school left empty.
 */

/** A field's value, or the dash the design shows where nothing is held. */
export function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** The halves of a name the record keeps apart, written as one line. */
export function fullName(...parts: (string | null | undefined)[]): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
}

/** Two letters for the square, off whichever half of the name is filled in. */
export function initialsOf(parts: (string | null | undefined)[]): string {
  const letters = parts.map((part) => part?.trim()[0]).filter(Boolean)
  return letters.length ? letters.join('').toUpperCase() : '··'
}

/**
 * An ISO timestamp as the design writes dates. Anything else is left alone —
 * the API also sends dates as DD/MM/YYYY, which `Date` would read back as the
 * American order and quietly move.
 */
export function asDate(value: string | null | undefined): string {
  if (!value) return BLANK
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : formatDate(date)
}
