import { request, toFormData } from '../client'
import type { Id } from '../types'
import type {
  Book,
  BookBody,
  BookOut,
  BookSearchParams,
  BookStock,
  CorrectLoanBody,
  LendBody,
  Loan,
  LoanSummary,
  PayFineBody,
  PayForBookBody,
  ReturnLoanBody,
  StudentLoanHistory,
} from './types'

/**
 * Every lending read wears an envelope, and **not the same one**: `/loanedbooks`
 * and `/admins/borrowed-books` answer under `loans`, `/loanedbooks/overdue`
 * under `overdue`, `/loanedbooks/{id}` under `loan`. Read off bronze
 * 2026-09-15; the `data` and bare-array fallbacks are what was guessed before
 * that and are kept because they cost a line.
 */
function asLoans(answer: unknown): Loan[] {
  if (Array.isArray(answer)) return answer as Loan[]
  const wrapped = answer as { loans?: Loan[]; overdue?: Loan[]; data?: Loan[] } | null
  const loans = wrapped?.loans ?? wrapped?.overdue ?? wrapped?.data
  // An answer wearing none of the known shapes is a fault, not an empty
  // register: this list is the complete state of a set on the device, and a
  // fault read as "no loans" would erase the device's copy of the lending
  // register.
  if (!Array.isArray(loans)) {
    throw new Error('The server sent the loans in a shape this app cannot read.')
  }
  return loans
}

function asLoan(answer: unknown): Loan {
  const wrapped = answer as { loan?: Loan; data?: Loan } | null
  return wrapped?.loan ?? wrapped?.data ?? (answer as Loan)
}

/** A count the school sent, or undefined where it sent something else. */
function figure(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * One student's borrowing history, and **why** it says what it says.
 *
 * The three reason fields are carried through rather than dropped. This used
 * to rebuild the answer out of `may_borrow` and `loans` alone, so the desk was
 * told a student may not borrow and nothing about which book was out — the
 * dialog fell back to "The library will not lend to them at the moment" while
 * the title sat in the answer it had just thrown away. A reader that narrows
 * an answer is a reader that has to be widened again every time somebody wants
 * to say something true.
 */
function asHistory(answer: unknown): StudentLoanHistory {
  const wrapped = answer as { data?: unknown } | null
  const inner = (wrapped?.data ?? answer) as {
    student_id?: unknown
    may_borrow?: unknown
    books_out?: unknown
    fines_owing?: unknown
    borrowed?: unknown
    still_out?: unknown
  } | null
  return {
    student_id: figure(inner?.student_id),
    may_borrow: typeof inner?.may_borrow === 'boolean' ? inner.may_borrow : undefined,
    books_out: Array.isArray(inner?.books_out) ? (inner.books_out as BookOut[]) : undefined,
    fines_owing: figure(inner?.fines_owing),
    borrowed: figure(inner?.borrowed),
    still_out: figure(inner?.still_out),
    loans: asLoans(inner),
  }
}

export const libraryService = {
  /**
   * The catalogue, whole — the endpoint ignores paging. Read for the issue
   * flow's book picker; the catalogue has no page of its own any more, and
   * the add and edit flows are the only writers left against it.
   */
  books: (params: BookSearchParams = {}) =>
    request<{ books: Book[] }>('admins/books', { query: { ...params } }).then(
      (data) => data.books,
    ),

  /** A new title on the shelf. Multipart, since the endpoint takes a cover. */
  addBook: (body: BookBody) =>
    request<{ book: Book }>('admins/books', { method: 'POST', form: toFormData(body) }),

  /**
   * Changes a title. Sent whole rather than as a diff — whether the endpoint
   * updates partially has never been proved, so the edit flow merges what was
   * typed over the record it fetched and sends everything.
   */
  updateBook: (id: Id, body: BookBody) =>
    request<{ book: Book }>(`admins/books/${id}`, { method: 'POST', form: toFormData(body) }),

  /** Every borrowing, newest first. */
  loans: () => request<unknown>('loanedbooks').then(asLoans),

  /** One borrowing, with `penalty_if_returned_today` for the desk to quote. */
  loan: (id: Id) => request<unknown>(`loanedbooks/${id}`).then(asLoan),

  /** What is out, late and owed, and the fine rate. Keys not yet read. */
  summary: () => request<LoanSummary>('loanedbooks/summary'),

  /**
   * Overdue loans, under `overdue` rather than `loans`, beside a `count` and a
   * `fines_if_returned_today` total. The rows are the same flat shape the
   * register reads, so the envelope is all that differs — and it is why this
   * threw before the answer had been looked at.
   */
  overdue: () => request<unknown>('loanedbooks/overdue').then(asLoans),

  /** Every borrowing with the pupil and the title expanded; no pagination. */
  borrowedBooks: () =>
    request<unknown>('admins/borrowed-books').then(asLoans),

  /** Copies minus loans not yet returned. `available` is the truth. */
  stock: (bookId: Id) =>
    request<BookStock | { stock?: BookStock }>(`loanedbooks/stock/${bookId}`).then(
      (answer) => ('stock' in answer && answer.stock ? answer.stock : (answer as BookStock)),
    ),

  /**
   * Lends one copy of one title, off the book rather than off the register:
   * `POST /admins/books/{bookId}/lend`. 409 with a reason — a book already
   * out, a fine owing, or no copy left.
   */
  lend: (bookId: Id, body: LendBody) =>
    request<unknown>(`admins/books/${bookId}/lend`, { method: 'POST', body }),

  /**
   * Marks a copy returned — `POST /admins/books/{bookId}/return`, keyed on the
   * book the same way lending is, with the pupil in the body.
   *
   * **Both halves are needed**, and the second is what was missing. The path
   * names the title; `student_id` names whose copy came back. Sent without it,
   * a title with two copies out to two pupils is refused with 409 — the school
   * cannot know which borrowing to close — and that is what stopped the desk
   * returning anything at all.
   *
   * A probe with `student_id: 999999` came back with that same 409, which
   * reads as the key being ignored and is not: there was no borrowing of that
   * book by that pupil to close, and the endpoint has only the one sentence
   * for it. Worth remembering when the next key is tested — an id nothing
   * holds proves nothing either way.
   *
   * One blind alley worth not walking down twice: `/loanedbooks/{loanId}/return`
   * exists and looks like the loan-keyed answer, but it addresses the
   * `loanedbooks` table, while every borrowing this school holds carries
   * `source: "borrowedbooks"` — `GET /loanedbooks/2` is a 404 for a loan
   * sitting in the register. Nor is the route the 409 advertises deployed:
   * `/admins/borrowed-books/{loanId}/return` answers "No API endpoint matches"
   * however it is spelled.
   *
   * 409 if the copy is already back.
   */
  returnLoan: (bookId: Id, body: ReturnLoanBody) =>
    request<unknown>(`admins/books/${bookId}/return`, { method: 'POST', body }),

  /** Settles the money only — the book stays out until `returnLoan`. */
  payFine: (id: Id, body: PayFineBody = {}) =>
    request<unknown>(`loanedbooks/${id}/pay`, { method: 'POST', body }),

  /**
   * Takes the overdue fine on a copy being handed back —
   * `POST /books/{bookId}/pay`, keyed on the book with the pupil in the body,
   * the same address lending and returning use.
   *
   * Called by the return flow before the return itself, and only where the
   * desk typed an amount: money first, then the book, so a payment that is
   * refused leaves the copy where everybody can still see it is out. See
   * `PayForBookBody` — this route is not deployed yet, and the empty box is
   * what keeps ordinary returns working until it is.
   */
  payForBook: (bookId: Id, body: PayForBookBody) =>
    request<unknown>(`books/${bookId}/pay`, { method: 'POST', body }),

  /** Only the due date and condition; `returned` and `paid` have their own. */
  correctLoan: (id: Id, body: CorrectLoanBody) =>
    request<unknown>(`loanedbooks/${id}`, { method: 'POST', body }),

  /** One student's history, with `may_borrow`. Office, student or guardian only. */
  studentLoans: (studentId: Id) =>
    request<unknown>(`loanedbooks/student/${studentId}`).then(asHistory),

  /** The signed-in student's own borrowings. */
  myLoans: () => request<unknown>('loanedbooks/mine').then(asLoans),

  /** Deletes the record; an outstanding copy goes back on the shelf itself. */
  removeLoan: (id: Id) => request<unknown>(`loanedbooks/${id}`, { method: 'DELETE' }),
}
