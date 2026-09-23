import type { Loan, PayForBookBody, ReturnLoanBody } from '../../../api/library/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import {
  first,
  loanBook,
  loanBookId,
  loanBorrowed,
  loanDue,
  loanFine,
  loanPaid,
  loanStanding,
  loanStudent,
  loanStudentId,
} from '../../../features/library/loan-read.ts'
import type { Row } from '../../../features/collections/types.ts'
import { when } from '../../../features/collections/when.ts'
import { formatNaira } from '../../../lib/format.ts'

/**
 * One borrowing as the lending register reads it. The reading itself —
 * which key carries the name, when a loan counts as overdue — lives in
 * `features/library/loan-read`, shared with the student's own page.
 */

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

export {
  loanBook,
  loanBookId,
  loanFine,
  loanPaid,
  loanStanding,
  loanStudent,
  loanStudentId,
}

/**
 * `named` puts a name to the loan's `student_id`, read from the student
 * directory this device already holds — the loan controller sends `student:
 * null` and `regno: null`, so without it the office's register is a column of
 * "Student 12". See `loanStudent`.
 */
export function loanRow(loan: Loan, today = new Date(), named?: string): Row {
  const fine = loanFine(loan)
  return {
    id: String(loan.id),
    student: loanStudent(loan, named),
    book: loanBook(loan),
    due: when(loanDue(loan) || null),
    standing: loanStanding(loan, today),
    fine: Number.isFinite(fine) && fine > 0 ? formatNaira(fine) : BLANK,
    paid: loanPaid(loan),

    // Read by the record panel and the flows, not by the table.
    // The date as the API wrote it, for the correction form to open on.
    due_raw: loanDue(loan),
    // The title's own id. The row's `id` is the loan's, and returning is keyed
    // on the book — so without this the return flow has the words for a title
    // and no way to name it.
    book_id: loanBookId(loan),
    student_id: loanStudentId(loan),
    borrowed: when(loanBorrowed(loan) || null),
    returned_on: when(loan.returned_on),
    // The condition alone: `status` is the expanded shape's word for whether
    // the book is back, not the state it came back in.
    condition: text(first(loan.condition) || null),
    // What the desk quotes before the handover. On the detail answer only.
    penalty_today:
      loan.penalty_if_returned_today != null && loan.penalty_if_returned_today !== ''
        ? formatNaira(Number(loan.penalty_if_returned_today))
        : BLANK,
  }
}

/** What is lost with the record — and what the API quietly puts back. */
export function loanDeleteBody(row: Row): string {
  return `The record of ${row.book} against ${row.student} is deleted. If the copy is still out, it goes back on the shelf as if never lent — the fine goes with the record.`
}

/**
 * The return as `POST /admins/books/{bookId}/return` takes it.
 *
 * Both halves of the address are here because neither is enough on its own:
 * the book id is the path, and `student_id` is what tells two borrowings of
 * one title apart. A school with two copies of a set text out to two children
 * is refused with 409 where the pupil is not named, which is what once stopped
 * the desk returning anything of that title at all.
 *
 * Returns `null` where the row cannot name either, so the caller refuses
 * rather than posting a path with a hole in it or a body naming nobody. A loan
 * read off a shape that spells the ids some third way is exactly the silent
 * case CLAUDE.md keeps warning about — a wrong reader looks like an empty
 * field, and an empty field here would return the wrong child's book.
 */
export function returnRequest(
  row: Row,
  condition: string,
): { bookId: string; body: ReturnLoanBody } | null {
  const bookId = String(row.book_id ?? '').trim()
  const studentId = Number(row.student_id)
  if (!bookId || !Number.isFinite(studentId) || studentId <= 0) return null

  const said = condition.trim()
  return {
    bookId,
    // The condition under both names it could have — see `ReturnLoanBody`.
    // They carry the same word, so they cannot disagree.
    body: { student_id: studentId, status: said, condition: said },
  }
}

/**
 * The fine as `POST /books/{bookId}/pay` takes it, or `null` where there is
 * nothing to pay.
 *
 * Nothing to pay is the ordinary case and is not an error: most books come
 * back on time, the box is left empty, and the return goes through on its own
 * as it always has. A figure of nought is the same answer — a payment of
 * nothing is a receipt for nothing, and writing one would put a transaction on
 * a loan that never owed anything.
 *
 * Takes the amount already parsed out of naira, so this stays free of the
 * money field's own formatting.
 */
export function fineRequest(
  row: Row,
  amount: number,
): { bookId: string; body: PayForBookBody } | null {
  if (!Number.isFinite(amount) || amount <= 0) return null

  const bookId = String(row.book_id ?? '').trim()
  const studentId = Number(row.student_id)
  if (!bookId || !Number.isFinite(studentId) || studentId <= 0) return null

  return { bookId, body: { student_id: studentId, amount } }
}
