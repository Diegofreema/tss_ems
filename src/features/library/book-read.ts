import type { Book } from '../../api/library/types.ts'

/**
 * Reading a catalogue row, whose `isavailable` field changed meaning under us.
 *
 * Until 2026-09-15 it was a **word** — `"Available"` / `"Unavailable"` — and
 * the office's own switch for whether a title was lent at all, with nothing to
 * do with how many copies were on the shelf. On 2026-09-16 bronze answered
 * with a **number** instead: book 1 reads `isavailable: 14` beside
 * `copies: 15`, and `GET /loanedbooks/stock/1` says `{copies: 15, on_loan: 1,
 * available: 14}`. So it is now the free-copy count, and the same figure the
 * lending picker already filters on.
 *
 * That change took the library register down rather than merely showing the
 * wrong word: the row handed a number to a column reader that trims strings,
 * and `filledColumns` threw `value.trim is not a function` through the whole
 * page. Which is the standing lesson in this codebase said once more — a
 * reader written against a shape is a guess, and this one was right when it
 * was written.
 *
 * Both shapes are read here so a deployment still on the old one is not
 * broken by the fix to the new one.
 */

/**
 * Copies free to lend, and null where the row does not say.
 *
 * Null is not nought: the old word carries no count at all, and treating
 * `"Available"` as nought free copies would empty a shelf of thirty.
 */
export function freeCopies(book: Pick<Book, 'isavailable'>): number | null {
  const value = book.isavailable
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  // A number the school sent as a string is still a number. Guarded on the
  // digits, or `Number('Available')` would read NaN as "no copies".
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim())
  return null
}

/**
 * Copies the library keeps rather than lends.
 *
 * The school's rule, set 2026-09-16: **the last copy never leaves.** A title
 * down to one free copy keeps it on the shelf as the reference copy, so a
 * pupil who needs to look something up in the library always can, and a set
 * text cannot be borrowed into a state where the school itself has none.
 *
 * Written once, here, because four separate places decide whether a title can
 * go out — the register's tag, the record, and the lending picker's online and
 * offline halves — and a rule spelled out four times is a rule that drifts. It
 * is deliberately a constant and not a setting: no endpoint carries one, and a
 * number invented in a form would be a policy the school could not see.
 *
 * The consequence to be clear about: a title the library holds **one** copy of
 * is never lendable at all. That is the policy working, not a bug — a single
 * copy is a reference copy by definition.
 */
export const RESERVED_COPIES = 1

/**
 * Whether a count of free copies leaves one to lend, once the reserve is kept.
 *
 * Takes the figure rather than the book, so the lending picker can apply the
 * same rule to `GET /loanedbooks/stock/{id}`'s `available` and to the count it
 * works out offline. A figure that cannot be read is lendable: a dropped stock
 * request is not evidence a book is gone, and the lend endpoint refuses with
 * its own reason where no copy is left.
 */
export function lendableCount(available: unknown): boolean {
  // Null and undefined are both "the school did not say", never "none left".
  // `Number(null)` is 0, which would have read a missing figure as an empty
  // shelf and quietly dropped the title from the counter's list.
  if (available === null || available === undefined) return true
  const free = Number(available)
  return Number.isFinite(free) ? free > RESERVED_COPIES : true
}

/**
 * What the register's Lending tag says.
 *
 * Three answers rather than two, because with a copy held back there are three
 * states and they are not the same news at a counter:
 *
 *  - **Available** — more than the reserve is free, so a copy can go out.
 *  - **Unavailable** — one copy free, and it is the one the library keeps. The
 *    book is *in the building* and can be read there; it cannot be taken away.
 *  - **All out** — every copy is with a borrower, the reference copy included,
 *    so there is nothing on the shelf at all.
 *
 * The middle one is the school's own word for it. It reads as a refusal rather
 * than as a shortage, which is right: nothing is missing, the copy is simply
 * not for lending.
 *
 * A deployment still sending the word gets its own word back, since that one
 * really is the office's switch and "retired" is what it means.
 */
export function lendingLabel(book: Pick<Book, 'isavailable'>): string {
  const free = freeCopies(book)
  if (free !== null) {
    if (free > RESERVED_COPIES) return 'Available'
    return free > 0 ? 'Unavailable' : 'All out'
  }
  return typeof book.isavailable === 'string' && book.isavailable.trim()
    ? book.isavailable.trim()
    : 'Unknown'
}

/**
 * Whether a copy could go out today, on whichever shape the row wears.
 *
 * The worded shape has no count to keep a reserve out of, so it falls back to
 * the office's switch — which is all that shape ever meant.
 */
export function canLend(book: Pick<Book, 'isavailable'>): boolean {
  const free = freeCopies(book)
  return free !== null ? lendableCount(free) : book.isavailable !== 'Unavailable'
}
