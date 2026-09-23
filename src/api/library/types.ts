export type Book = {
  id: number
  title: string
  author: string
  pubdate: string | null
  /**
   * **Two shapes, and it changed meaning between them.** Until 2026-09-15 this
   * was the office's lending switch, spelled as a word — `"Available"` /
   * `"Unavailable"` — and said nothing about stock. On 2026-09-16 bronze sent
   * a **number** instead: book 1 reads `isavailable: 14` beside `copies: 15`,
   * which is exactly `GET /loanedbooks/stock/1`'s `available`. So it is the
   * free-copy count now.
   *
   * Never read directly — `freeCopies` / `lendingLabel` / `canLend` in
   * `features/library/book-read.ts` take either. Reading it as a string is
   * what took the library register down: a number reached a column reader that
   * trims, and the page died on `value.trim is not a function`.
   */
  isavailable: number | 'Available' | 'Unavailable'
  date_created: string
  user_id: number
  isbn: string | null
  coverphoto: string | null
  copies: number
  section: string | null
  callno: number | string | null
  department_id: number | null
}

/**
 * `POST /admins/books`. Multipart on the wire — `bookimage` is a cover
 * upload — though the add-title flow sends no file; nothing displays covers.
 */
export type BookBody = {
  title?: string
  author?: string
  isbn?: string
  isavailable?: Book['isavailable']
  department_id?: number
  copies?: number
  callno?: number | string
  section?: string
  pubdate?: string
  bookimage?: File
}

/**
 * `GET /admins/books`. **Paginated from 2026-09-17** — it used to answer with
 * the whole library on every call.
 *
 * `q` is the one box: it matches the title, the author and the ISBN together,
 * which is what a desk with a book in its hand actually wants. The three
 * named fields are the older form and AND with each other.
 */
export type BookSearchParams = {
  /** Title, author or ISBN, in one term. */
  q?: string
  booktitle?: string
  bookauthor?: string
  isbn?: string
  page?: number
  limit?: number
}

/*
 * Lending, under `/loanedbooks`. A borrowing is its own record with its own
 * id — returns, fines and corrections are all keyed on the loan, never on the
 * book. Availability is copies minus loans not yet returned; the catalogue's
 * `isavailable` is only the office's lending switch.
 *
 * The controller's live answers have not been read yet: the field names below
 * are the contract's own, and the readers over them tolerate the obvious
 * variants (a name flattened or nested) until a live row pins the shape down.
 */

/** One borrowing. `returned` and `paid` are the words 'Yes' and 'No'. */
/**
 * One borrowing. **Read off bronze on 2026-09-15**, which is the first time any
 * of these rows had been seen, and they are two shapes rather than one:
 *
 * - `/loanedbooks`, `/loanedbooks/{id}` and `/loanedbooks/overdue` send a
 *   **flat** row — `book` is the *title as a string*, `student` is `null`, the
 *   dates are `borrowed` and `due`, and `returned`/`paid`/`overdue` are real
 *   booleans. This is what the office's register is drawn from.
 * - `/admins/borrowed-books` sends an **expanded** row — `book` is the whole
 *   catalogue record and `student` the whole pupil record, with `date` and
 *   `datetoreturn` for the dates and `status: "not returned"` in place of the
 *   flags.
 *
 * Both are typed here because both are live, and the readers in
 * `features/library/loan-read.ts` take either. What is *not* here any more is
 * the set of names the 2026-09-03 contract published and nothing sends:
 * `book_title`, `student_name`, `due_date`, `toreturn`, `borrowed_on`,
 * `date_created`, `dateadded`. They were read first by every reader, which is
 * why the register showed "Student 12" borrowing "Book 2" with no due date and
 * everything standing "Out".
 */
export type Loan = {
  /**
   * **Not unique on its own.** Both lending tables number from 1, so a row is
   * identified by `source` *and* `id` together — the school's own collection
   * says so, and its example list carries `id: 1` twice, once from each table.
   *
   * Everything on this device that keys a loan uses `loanKey` for that reason.
   * Keying on this alone means the collection holds one of the two and drops
   * the other, silently, which is the exact failure CLAUDE.md warns about for
   * a key guessed from an unseen shape.
   */
  id: number
  /**
   * Which table the row came from: `loanedbooks` is the library desk, the only
   * flow that can lend from 2026-09-17; `borrowedbooks` is the retired
   * assign-book screen, whose rows are still listed and still have to be
   * returnable.
   */
  source?: LoanSource | null
  /**
   * Whether a fine on this row can actually be **recorded and settled**.
   *
   * False on every `borrowedbooks` row: that table has no penalty column and
   * no paid column, so the figure beside it is what *would* be owed rather
   * than a debt the school has booked, and there is nowhere to mark it paid.
   * The school's own instruction is to offer no Collect button on those, and
   * `fineTracked` in `features/library/loan-read.ts` is what the flows ask.
   */
  fine_tracked?: boolean | null
  student_id?: number | null
  /** Expanded on `/admins/borrowed-books`; `null` on the flat shape. */
  student?: {
    id?: number | null
    fname?: string | null
    mname?: string | null
    lname?: string | null
    regno?: string | null
  } | null
  /** Flat on the loan controller, `null` beside the expanded pupil. */
  regno?: string | null
  book_id?: number | null
  /** The title as a string on the flat shape, the record on the expanded one. */
  book?: string | { id?: number | null; title?: string | null; author?: string | null } | null
  /** Flat: the day it went out. Expanded: `date`, a full timestamp. */
  borrowed?: string | null
  date?: string | null
  /** Flat: `due`. Expanded: `datetoreturn`. Both YYYY-MM-DD. */
  due?: string | null
  datetoreturn?: string | null
  returned_on?: string | null
  /** Booleans on the flat shape. */
  returned?: boolean | null
  paid?: boolean | null
  overdue?: boolean | null
  /** Whole days past the due date, the school's own arithmetic. */
  days_overdue?: number | null
  /** The expanded shape's words instead of the flags — "not returned". */
  status?: string | null
  /** The state the book came back in. */
  condition?: string | null
  /** The fine as it stands: 0 until the copy is actually back. */
  penalty?: number | string | null
  /** What the desk quotes before the handover. On the list as well as the record. */
  penalty_if_returned_today?: number | string | null
  /** Who issued it. */
  admin_id?: number | null
}

/**
 * `/loanedbooks/summary` — what is out, late and owed, and the school's own
 * lending rules. Keys read off bronze 2026-09-15:
 * `{loans, out, overdue, fines_owing, fine_per_day, loan_days}`.
 *
 * Still not what the Lending page's tiles read: they count the set on the
 * device, which is the rule for every counted tile in this app — a figure
 * fetched separately from the rows under it can disagree with them, and cannot
 * be shown at all with no connection. This is here for a page that wants the
 * fine rate or the loan length, neither of which is derivable from the rows.
 */
export type LoanSource = 'loanedbooks' | 'borrowedbooks'

/**
 * `GET /loanedbooks` narrows and pages. `returned` and `paid` are the words
 * "Yes" and "No" here, which is what the columns hold — not the booleans the
 * rows come back with.
 *
 * The whole set is read rather than narrowed at the endpoint, per the rule in
 * CLAUDE.md: a set narrowed at the fetch cannot be widened again without a
 * connection to widen it over. These are typed for a caller that wants one
 * answer rather than a set.
 */
export type LoanParams = {
  student_id?: number
  book_id?: number
  returned?: 'Yes' | 'No'
  paid?: 'Yes' | 'No'
  overdue?: 1
  page?: number
  /** Capped at 200 by the server, whatever is asked for. */
  limit?: number
}

export type LoanSummary = {
  /** Every borrowing on record. */
  loans?: number | null
  /** Out and not yet back. */
  out?: number | null
  overdue?: number | null
  fines_owing?: number | null
  /** The school's own two lending rules, which no row carries. */
  fine_per_day?: number | null
  loan_days?: number | null
  /**
   * The same counts split by table. `loans`, `out` and `overdue` above span
   * both; this is what makes a total that disagrees with one desk's own list
   * explicable rather than baffling. `fines_owing` is the desk's alone, since
   * the older table has no column to owe in.
   */
  by_source?: Record<LoanSource, { loans?: number | null; out?: number | null }> | null
}

/**
 * `/loanedbooks/stock/{bookId}` — read off bronze 2026-09-15:
 * `{book_id, title, copies, available, on_loan, label}`. `available` is the
 * number to trust, and it is `copies` minus `on_loan`; `label` is the
 * catalogue's own `isavailable` switch, which says whether the office lends the
 * title at all and not whether a copy is there.
 */
export type BookStock = {
  book_id?: number | null
  title?: string | null
  available?: number | null
  on_loan?: number | null
  label?: string | null
  copies?: number | null
}

/**
 * `POST /loanedbooks` — **the only way to lend a book** from 2026-09-17.
 *
 * `POST /admins/books/{bookId}/lend` is retired and answers 410 with its own
 * sentence, which is how this was found: the desk pressed Issue and read the
 * school telling it to use this route. That endpoint wrote to a table with no
 * penalty and no paid column, so a book lent through it could never be fined
 * or settled — which is the whole reason it went.
 *
 * The book moves from the path into the body, beside the pupil. `toreturn` is
 * optional: left out, the school lends for its own `Library.loanDays`, which
 * is 14. The flow still asks for a date, because a desk that cannot see the
 * due date it is agreeing to is a desk that cannot tell a pupil when to come
 * back.
 *
 * 409 with the reason where a rule refuses it — the pupil already has this
 * title out, is holding any other book, owes a fine, or nothing is on the
 * shelf. All four are judged across **both** lending tables, so a book out
 * through the retired screen blocks a loan here. 422 means the body was
 * wrong, not that the loan was refused.
 */
export type LendBody = {
  student_id: number
  book_id: number
  /** The state the copy is in as it goes out. */
  status?: string
  /** YYYY-MM-DD. Left out, the school's own loan length applies. */
  toreturn?: string
}

/**
 * `POST /books/{bookId}/return` — keyed on the book, as lending is, and not on
 * the loan. 409 where the copy is already back.
 *
 * The book id alone does not settle which borrowing closed, so the pupil goes
 * in the body. That question was open in this comment for a while and the
 * answer is `student_id`.
 */
export type ReturnLoanBody = {
  /**
   * Which pupil's copy came back — what tells two borrowings of one title
   * apart, since the route itself names only the book.
   *
   * Without it the school refuses a title with more than one copy out: "2
   * copies of that title are out, to 2 pupils." A probe with an id nothing
   * holds (`student_id: 999999`) came back with that same sentence, which
   * reads as the key being ignored and is not — there was simply no borrowing
   * of that book by that pupil to close, and the endpoint says so in the only
   * words it has for it.
   */
  student_id?: number
  /**
   * The condition the book came back in — "in good shape", "Damaged", "Lost".
   *
   * `status` and nothing else. This used to go under `condition` as well, on
   * the reasoning that the two endpoints either side of it disagree and a key
   * the controller does not know is harmlessly ignored. The school's own API
   * client settles it: `status`. The second key is dropped rather than left
   * in — a body carrying a field nobody reads is a body the next person has
   * to work out the truth of again.
   */
  status?: string
  /** YYYY-MM-DD, to backdate the return. Left out, it is today. */
  returned_on?: string
}

/**
 * What a return answers with — and it is the whole reason the desk needs no
 * second lookup to charge a fine.
 *
 * The school works out whether the copy is late **as it comes back**, so the
 * figure is in the reply: `fine.amount` is `days_late × rate_per_day`, and
 * `fine.collect` names exactly what to pay against. `fine.paid` is always
 * false here — returning a book collects nothing, by design.
 *
 * That ordering is the school's, and it is the opposite of what this app did
 * before: a fine cannot be paid before the book is back, because it does not
 * exist until then. `POST /books/{id}/pay` looks for *who owes something on
 * this book*, not for an open loan, so paying first answers 409 "There is no
 * fine to pay on that book for that pupil."
 */
export type ReturnAnswer = {
  loan?: Loan | null
  /** The fine as booked. Same figure as `fine.amount`. */
  penalty?: number | null
  fine?: FineBlock | null
}

/** The charge a return worked out, with everything needed to explain it. */
export type FineBlock = {
  /** True when there is anything at all to pay. */
  overdue?: boolean | null
  due?: string | null
  /** The day it actually came back — `returned_on`, or today. */
  returned_on?: string | null
  /** Due to returned_on. An early return is 0, never negative. */
  days_late?: number | null
  /** From the school's own settings, not from anything typed here. */
  rate_per_day?: number | null
  amount?: number | null
  currency?: string | null
  /** e.g. "NGN 300.00". */
  amount_in_words?: string | null
  /** Always false on a return: the money is a second step. */
  paid?: boolean | null
  /** What to pay against, whichever of the two pay routes is used. */
  collect?: {
    loan_id?: number | null
    book_id?: number | null
    student_id?: number | null
  } | null
}

/**
 * `POST /loanedbooks/{loanId}/pay` — the money only, never the book.
 *
 * The desk uses the by-book route instead (`PayForBookBody`): a counter has
 * the book and the pupil, not an internal loan id, and the two lending tables
 * both number from 1 so a loan id is ambiguous without its table. This stays
 * typed because the route is live and a client holding a loan id may use it.
 */
export type PayFineBody = {
  book_id?: number
  student_id?: number
  /** Left out, the full fine as it stands is taken. */
  amount?: number
}

/**
 * `POST /books/{bookId}/pay` — the overdue fine, taken at the counter as the
 * copy is handed back.
 *
 * Keyed on the book like lending and returning, so the pupil goes in the body
 * for the same reason: a title with two copies out has two borrowings, and the
 * path names neither. `amount` is what the desk actually took, which is not
 * always the whole fine.
 *
 * Confirmed against the school's own API client on 2026-09-17, which is also
 * where the sibling return route came from. A probe on 2026-09-16 had this
 * answering "No API endpoint matches" under every spelling tried, so it went
 * in behind an optional box; the school has it now.
 *
 * The box it is typed into is required on an overdue copy and optional on one
 * that is back on time — the school's rule, not this app's: a late book is not
 * handed back until the fine on it has been taken.
 */
export type PayForBookBody = {
  /** Whose copy — what tells two borrowings of one title apart. */
  student_id?: number
  /**
   * Naira, as a number. What was handed over, which need not be the whole
   * fine — the school takes it as a part payment or a reduction.
   *
   * Optional: left out entirely, the fine is taken as it stands at the
   * server, which is the figure that cannot go stale. The desk's form sends
   * one because somebody is counting notes onto a counter and the amount they
   * counted is the thing worth recording.
   */
  amount?: number
}

/**
 * `POST /loanedbooks/{loanId}` — only these two are correctable here.
 * `returned` and `paid` are not settable: /return and /pay own those, and
 * they keep the shelf and the fine in step.
 *
 * **The names are `toreturn` and `status`**, read off the school's own
 * collection on 2026-09-17. This was typed `{due_date, condition}` — neither
 * of which the controller reads, so a correction posted both and changed
 * nothing, with a 200 and a cheerful toast over it. The silent kind.
 */
export type CorrectLoanBody = {
  /** YYYY-MM-DD, the new due date. */
  toreturn?: string
  /** The condition, in words. */
  status?: string
}

/**
 * `/loanedbooks/student/{studentId}` — one student's borrowing history, with the
 * flag a client reads to disable the borrow button before the desk tries.
 * `may_borrow` is undefined where the answer did not carry it, and the desk
 * then simply asks the lend endpoint, which answers with its own reason.
 */
export type StudentLoanHistory = {
  student_id?: number | null
  may_borrow?: boolean
  loans: Loan[]
  /**
   * Why the flag says what it says — read off bronze 2026-09-16, alongside
   * `borrowed` (loans ever made) and `still_out` (how many of them are).
   *
   * Both are worth having rather than guessing between: the desk used to be
   * told "one is still out against them, or a fine is owing", which is the
   * portal reciting the two rules it knows about instead of reading the
   * answer in front of it. The school names the title and totals the fine.
   */
  books_out?: BookOut[] | null
  /** Naira, and `0` on every student read so far. */
  fines_owing?: number | null
  borrowed?: number | null
  still_out?: number | null
}

/** One title a student has not brought back, as the history lists it. */
export type BookOut = {
  book_id?: number | null
  title?: string | null
  loan_id?: number | null
  source?: string | null
}
