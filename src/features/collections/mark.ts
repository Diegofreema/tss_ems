import { BLANK } from './blank.ts'

/**
 * A score as the screens show it. The API quotes its marks — "77.00" — so each
 * is read as a number, and anything unreadable is no mark at all rather than
 * a zero somebody could be marked down for.
 */
export function mark(value: string | number | null | undefined): string {
  // Before the number: `Number(null)` and `Number('')` are both 0, and a mark
  // the school never filed is not a student who scored nothing.
  if (value === null || value === undefined || String(value).trim() === '') return BLANK
  const parsed = Number(value)
  return Number.isFinite(parsed) ? String(Math.round(parsed * 100) / 100) : BLANK
}
