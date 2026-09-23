import type {
  Loan,
  PayForBookBody,
  ReturnAnswer,
  ReturnLoanBody,
} from '../../../api/library/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import {
  fineTracked,
  first,
  loanBook,
  loanBookId,
  loanBorrowed,
  loanDue,
  loanFine,
  loanKey,
  loanSource,
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
  fineTracked,
  loanBook,
  loanBookId,
  loanKey,
  loanSource,
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
    // `source:id`, never the bare number — the two lending tables both count
    // from 1. See `loanKey`.
    id: loanKey(loan),
    source: loanSource(loan),
    // Read by the flows: a fine on the retired table can be quoted but never
    // booked or settled, so no Collect button is offered against one.
    fine_tracked: fineTracked(loan) ? 'Yes' : 'No',
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
 * The return as `POST /books/{bookId}/return` takes it.
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

  return {
    bookId,
    // `status`, and only `status` — see `ReturnLoanBody`. The school's own
    // client settles a question this used to hedge by sending both names.
    body: { student_id: studentId, status: condition.trim() },
  }
}

/**
 * Whether the desk has to take money before this copy goes back on the shelf.
 *
 * The school's rule rather than this app's: a late book is not handed back
 * until the fine on it has been settled. So the return form asks for the
 * figure, and on an overdue copy it asks for it as a requirement — the box
 * cannot be skipped and a nought will not do.
 *
 * Read off the row's own standing, which is what the register, the tag and
 * this share: `loanStanding` believes the school's `overdue` flag where it
 * sends one and works it out against the due date where it does not. A copy
 * already back is never late in this sense — the loan is closed and there is
 * nothing left to hand over — which is what stops the flow demanding a fine
 * on a record being corrected.
 */
export function fineDue(row: Row): boolean {
  return row.standing === 'Overdue'
}

/**
 * What the school says is owed, off the answer a return gave back. NaN where
 * the answer carried no fine block at all.
 *
 * The figure is the school's own arithmetic — days late times its own rate —
 * worked out as the copy came in, which is the only moment it can be: a fine
 * does not exist until the book is back.
 */
export function fineOwed(answer: ReturnAnswer | null | undefined): number {
  const amount = answer?.fine?.amount ?? answer?.penalty
  if (amount == null) return Number.NaN
  return Number(amount)
}

/**
 * The payment to make **after** a return, or `null` where there is none to
 * make.
 *
 * Two things have to be true: the school's own answer says something is owed,
 * and the desk counted money onto the counter. Either alone is not a payment.
 * Sending one anyway is not harmless — `POST /books/{id}/pay` answers 409
 * "There is no fine to pay on that book for that pupil", so a return that was
 * perfectly fine would end in a refusal at the desk.
 *
 * The ids come from the school's own `collect` block where it sent one, since
 * that names the loan it has just booked the fine against, and from the row
 * otherwise — the same pair the return itself was addressed with.
 */
export function collectRequest(
  answer: ReturnAnswer | null | undefined,
  row: Row,
  amount: number,
): { bookId: string; body: PayForBookBody } | null {
  if (!Number.isFinite(amount) || amount <= 0) return null

  // The school's own verdict on whether anything is owed. `overdue: false` is
  // a real answer and is believed; a missing block says nothing either way,
  // and then the amount the desk entered decides.
  if (answer?.fine && answer.fine.overdue === false) return null

  const collect = answer?.fine?.collect
  const bookId = String(collect?.book_id ?? row.book_id ?? '').trim()
  const studentId = Number(collect?.student_id ?? row.student_id)
  if (!bookId || !Number.isFinite(studentId) || studentId <= 0) return null

  return { bookId, body: { student_id: studentId, amount } }
}

