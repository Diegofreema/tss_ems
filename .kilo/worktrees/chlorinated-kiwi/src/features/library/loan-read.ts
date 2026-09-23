import type { Loan, StudentLoanHistory } from '../../api/library/types.ts'
import { formatNaira } from '../../lib/format.ts'
import { BLANK } from '../collections/blank.ts'

/**
 * Reading one borrowing, shared by the office's lending register and the
 * student's own page.
 *
 * **Rewritten against live rows on 2026-09-15.** These were written from the
 * contract received on 2026-09-03 and every one of them read a key the
 * controller does not send, so the register drew "Student 12" borrowing
 * "Book 2", no due date at all, every loan standing "Out" — returned ones
 * included — and an Overdue tile of nought beside two overdue books. Nothing
 * failed; it all read as blank or as a fallback, which is how a whole page can
 * be wrong and look fine. See the note on `Loan` for the two shapes.
 *
 * The rule the old version broke, and it is in CLAUDE.md: a test written
 * against a shape nobody produces proves nothing. These had passing tests.
 */

/** The first candidate that actually says something. */
export function first(...values: (string | null | undefined)[]): string {
  for (const value of values) if (value?.trim()) return value.trim()
  return ''
}

/** Which pupil this loan is against, as an id. Empty where the row says none. */
export function loanStudentId(loan: Loan): string {
  const id = loan.student_id ?? loan.student?.id
  return id == null ? '' : String(id)
}

/**
 * The student.
 *
 * The flat shape sends `student: null` and `regno: null` beside a
 * `student_id`, so on the office's register the name cannot come out of the
 * loan at all — it is looked up in the student directory the device already
 * holds and passed in as `named`. That is the same join the staff register
 * makes for a role, and it costs no request. The expanded shape carries the
 * whole pupil, and is read directly.
 *
 * `Student 12` remains the last resort, and it is a real answer rather than a
 * bug: a loan against a pupil this device has never synced can still be
 * listed, returned and paid for.
 */
export function loanStudent(loan: Loan, named?: string): string {
  const parts = loan.student
    ? [loan.student.fname, loan.student.mname, loan.student.lname]
        .filter(Boolean)
        .join(' ')
        .trim()
    : ''
  const id = loanStudentId(loan)
  return (
    first(parts, named, loan.student?.regno, loan.regno) ||
    (id ? `Student ${id}` : BLANK)
  )
}

/**
 * The title.
 *
 * `book` is the title itself on the flat shape and the whole catalogue record
 * on the expanded one — a string where the old reader expected an object,
 * which is why every row read `Book 2`.
 */
export function loanBook(loan: Loan): string {
  const book = loan.book
  const written = typeof book === 'string' ? book : (book?.title ?? '')
  return first(written) || (loan.book_id != null ? `Book ${loan.book_id}` : BLANK)
}

/**
 * Which title this loan is of, as an id rather than a name.
 *
 * Needed because returning is keyed on the **book**, not the loan
 * (`POST /admins/books/{bookId}/return`), so the register's row has to carry
 * the id and not only the words. Empty where the row names no book: the flow
 * says so rather than posting to a path with a hole in it.
 */
export function loanBookId(loan: Loan): string {
  const book = loan.book
  const id = loan.book_id ?? (typeof book === 'string' ? undefined : book?.id)
  return id == null ? '' : String(id)
}

/**
 * The fine as a figure. NaN where the row carries none.
 *
 * `penalty` is the fine as it stands, and it is **0 until the copy is actually
 * back** — a book 38 days late reads `penalty: 0` beside
 * `penalty_if_returned_today: 1900`. That is the library's own arithmetic and
 * is kept: what is owed is nothing until the book returns, and what it would
 * cost today is a quote, which the record panel shows under its own heading.
 */
export function loanFine(loan: Loan): number {
  const raw = loan.penalty
  if (raw == null || raw === '') return Number.NaN
  return Number(raw)
}

/** The due date as the API wrote it, or nothing. */
export function loanDue(loan: Loan): string {
  return first(loan.due, loan.datetoreturn)
}

/** The day it went out. A full timestamp on the expanded shape, a date on the flat. */
export function loanBorrowed(loan: Loan): string {
  return first(loan.borrowed, loan.date)
}

/**
 * Whether the copy is back.
 *
 * A boolean on the flat shape and a sentence on the expanded one — "not
 * returned", which is truthy, so anything reading it as a flag would have had
 * every loan back on the shelf.
 */
export function loanReturned(loan: Loan): boolean {
  if (typeof loan.returned === 'boolean') return loan.returned
  const status = loan.status?.trim().toLowerCase() ?? ''
  if (status) return status === 'returned'
  return Boolean(loan.returned_on?.trim())
}

/**
 * Out, Overdue or Returned — the one word the registers colour.
 *
 * The school's own `overdue` flag is taken where the row carries one, rather
 * than worked out here: it is the same judgement made against the server's
 * clock instead of the device's, and this app already treats the school's
 * clock as the one that counts. The date arithmetic stays as the fallback for
 * the expanded shape, which sends no flag — past the due date and not back is
 * the whole of the definition, and the whole due day is still on time.
 */
export function loanStanding(loan: Loan, today: Date): string {
  if (loanReturned(loan)) return 'Returned'
  if (typeof loan.overdue === 'boolean') return loan.overdue ? 'Overdue' : 'Out'
  const due = loanDue(loan)
  if (due) {
    const at = new Date(due)
    at.setHours(23, 59, 59, 999)
    if (!Number.isNaN(at.getTime()) && at < today) return 'Overdue'
  }
  return 'Out'
}

/**
 * Paid, Owing, or nothing where no fine ever arose.
 *
 * `paid` is a boolean, and `true` on a loan with no fine at all — so it is
 * read against the figure rather than alone: "Paid" over a nought would say
 * money changed hands where none was ever owed.
 */
export function loanPaid(loan: Loan): string {
  const fine = loanFine(loan)
  const owed = Number.isFinite(fine) && fine > 0
  if (!owed) return BLANK
  return loan.paid === true ? 'Paid' : 'Owing'
}

/**
 * Why the library will not lend to this student, in one line.
 *
 * Built from what the school actually says — `books_out` names the title and
 * `fines_owing` totals the money — rather than from the two rules the portal
 * happens to know. The sentence it replaced recited both and committed to
 * neither ("one is still out against them, or a fine is owing"), which is
 * longer than the answer and less use: the desk's next question is *which
 * book*, and the answer was already on the wire.
 *
 * Empty where the student may borrow, so the caller can ask this one question
 * instead of two.
 */
export function borrowBlock(history: StudentLoanHistory | null | undefined): string {
  // Only a flat `false` blocks. An answer without the flag proves nothing, and
  // the lend endpoint has its own refusal for whatever this cannot see.
  if (history?.may_borrow !== false) return ''

  const titles = (history.books_out ?? [])
    .map((one) => one?.title?.trim())
    .filter((title): title is string => Boolean(title))
  const out = Math.max(titles.length, Number(history.still_out) || 0)
  const fine = Number(history.fines_owing) || 0

  const said: string[] = []
  if (titles.length === 1) said.push(`They still have ${titles[0]} out.`)
  else if (out > 1) said.push(`They still have ${out} books out.`)
  else if (out === 1) said.push('They still have a book out.')
  if (fine > 0) said.push(`A fine of ${formatNaira(fine)} is owing.`)

  // The school said no and would not say why — which is still worth saying,
  // rather than inventing a reason to fill the line.
  return said.join(' ') || 'The library will not lend to them at the moment.'
}
