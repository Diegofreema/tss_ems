import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Loan } from '../../../api/library/types.ts'
import type { Row } from '../../../features/collections/types.ts'
import {
  loanBook,
  loanBookId,
  loanDeleteBody,
  loanFine,
  loanPaid,
  loanRow,
  loanStanding,
  loanStudent,
  loanStudentId,
  fineDue,
  collectRequest,
  fineTracked,
  loanKey,
  returnRequest,
} from './loan-row.ts'

/**
 * **Fixtures read off bronze on 2026-09-15**, not written from the contract.
 *
 * That distinction is why this file was rewritten rather than extended. The old
 * fixtures were the 2026-09-03 document's own field names — `book_title`,
 * `student_name`, `due_date`, `returned: 'Yes'`. Every test over them passed,
 * and the register they were guarding drew "Student 12" borrowing "Book 2" with
 * no due date and every loan, returned ones included, standing "Out". A test
 * written against a shape nobody produces proves nothing.
 *
 * Two shapes are live. The flat one is what the loan controller sends, and the
 * office's register is drawn from it.
 */
const FLAT: Loan = {
  id: 4,
  admin_id: 1,
  book: 'the new updated title',
  book_id: 1,
  borrowed: '2026-08-07',
  condition: 'in good shape',
  days_overdue: 38,
  due: '2026-08-08',
  overdue: true,
  paid: false,
  penalty: 0,
  penalty_if_returned_today: 1900,
  regno: null,
  returned: false,
  student: null,
  student_id: 8,
}

/** And this is `/admins/borrowed-books`, which expands both records. */
const EXPANDED: Loan = {
  id: 6,
  book_id: 40,
  book: { id: 40, title: 'Things Fall Apart', author: 'Chinua Achebe' },
  date: '2026-09-15T12:07:22+01:00',
  datetoreturn: '2026-09-29',
  status: 'not returned',
  student: { id: 120, fname: 'Lucy', mname: 'Chinenyenwa', lname: 'Obi' },
  student_id: 120,
}

const TODAY = new Date('2026-09-15T09:00:00+01:00')

test('the flat row the loan controller actually sends', () => {
  const row = loanRow(FLAT, TODAY, 'Ada Obi')
  assert.equal(row.id, '4')
  // `book` is the title itself here, not a record — the old reader looked for
  // `book.title` on a string and fell back to "Book 1" on every row.
  assert.equal(row.book, 'the new updated title')
  // The controller sends `student: null` and `regno: null`, so the name comes
  // from the directory the office already holds.
  assert.equal(row.student, 'Ada Obi')
  assert.equal(row.due, '08 Aug 2026')
  assert.equal(row.borrowed, '07 Aug 2026')
  assert.equal(row.standing, 'Overdue')
  assert.equal(row.book_id, '1')
  assert.equal(row.student_id, '8')
})

test('the expanded row `/admins/borrowed-books` sends', () => {
  const row = loanRow(EXPANDED, TODAY)
  assert.equal(row.book, 'Things Fall Apart')
  // No lookup needed: this shape carries the pupil.
  assert.equal(row.student, 'Lucy Chinenyenwa Obi')
  assert.equal(row.due, '29 Sept 2026')
  assert.equal(row.book_id, '40')
  // "not returned" is a sentence, and truthy — read as a flag it would have put
  // every borrowed book back on the shelf.
  assert.equal(row.standing, 'Out')
})

test('the school says whether a loan is overdue, and is believed', () => {
  // Its own clock, not this device's. The date arithmetic below is only the
  // fallback for the shape that sends no flag.
  assert.equal(loanStanding({ ...FLAT, overdue: true }, TODAY), 'Overdue')
  assert.equal(loanStanding({ ...FLAT, overdue: false }, TODAY), 'Out')
  // Returned settles it whatever the flag says.
  assert.equal(loanStanding({ ...FLAT, returned: true }, TODAY), 'Returned')
})

test('with no flag, past the due day is overdue and the due day itself is not', () => {
  assert.equal(loanStanding({ ...EXPANDED, datetoreturn: '2026-09-14' }, TODAY), 'Overdue')
  assert.equal(loanStanding({ ...EXPANDED, datetoreturn: '2026-09-15' }, TODAY), 'Out')
  assert.equal(loanStanding({ ...EXPANDED, status: 'returned' }, TODAY), 'Returned')
})

test('returned is a boolean on one shape and a sentence on the other', () => {
  assert.equal(loanRow({ ...FLAT, returned: true }, TODAY).standing, 'Returned')
  assert.equal(loanRow({ ...EXPANDED, status: 'returned' }, TODAY).standing, 'Returned')
  assert.equal(loanRow({ ...EXPANDED, status: 'not returned' }, TODAY).standing, 'Out')
})

test('the fine is what is owed now, not what returning today would cost', () => {
  // 38 days late and `penalty: 0` — nothing is owed until the copy is back, and
  // 1900 is the quote the desk reads out, kept under its own heading.
  assert.equal(loanFine(FLAT), 0)
  const row = loanRow(FLAT, TODAY)
  assert.equal(row.fine, '—')
  assert.equal(row.penalty_today, '₦1,900')
})

test('owing follows the figure, and paid is only said over a real fine', () => {
  const fined: Loan = { ...FLAT, returned: true, penalty: 300, paid: false }
  assert.equal(loanPaid(fined), 'Owing')
  assert.equal(loanPaid({ ...fined, paid: true }), 'Paid')
  // `paid` is `true` on a loan that never owed anything — saying "Paid" over a
  // nought would claim money changed hands where none was ever due.
  assert.equal(loanPaid({ ...FLAT, penalty: 0, paid: true }), '—')
})

/*
 * The title's id, which the row carries for one reason: returning a book is
 * `POST /admins/books/{bookId}/return`, keyed on the book as lending is. The
 * row's own `id` is the loan's, so reaching for it would post the return to
 * whichever *title* happens to share that number.
 */
test('the loan names which title it is of, however the row spells it', () => {
  assert.equal(loanBookId(FLAT), '1')
  assert.equal(loanBookId(EXPANDED), '40')
  // Flat wins over nested where a row somehow carries both, so the two readings
  // of one loan cannot disagree about which copy is coming back.
  assert.equal(loanBookId({ id: 7, book_id: 14, book: { id: 99 } }), '14')
})

test('a loan that names no title says so rather than guessing one', () => {
  // Empty, not "undefined" — the return flow refuses on this and tells the
  // desk, instead of posting to `/admins/books/undefined/return`.
  assert.equal(loanBookId({ id: 7, book: 'Things Fall Apart' }), '')
  assert.equal(loanBookId({ id: 7, book: { title: 'Things Fall Apart' } }), '')
  assert.equal(loanRow({ id: 7 }, TODAY).book_id, '')
})

// A zero is a real id to these readers — falsy, and not the same as absent.
test('an id of zero is an id, not a blank', () => {
  assert.equal(loanBookId({ id: 7, book_id: 0 }), '0')
  assert.equal(loanStudentId({ id: 7, student_id: 0 }), '0')
})

test('a row carrying only ids still says which ids', () => {
  const bare: Loan = { id: 9, student_id: 5, book_id: 2 }
  // Not a failure: a loan against a pupil this device has never synced is still
  // listed, returned and paid for.
  assert.equal(loanStudent(bare), 'Student 5')
  assert.equal(loanBook(bare), 'Book 2')
})

test('the delete confirm says the copy quietly goes back', () => {
  const body = loanDeleteBody(loanRow(EXPANDED, TODAY))
  assert.match(body, /Things Fall Apart against Lucy Chinenyenwa Obi/)
  assert.match(body, /goes back on the shelf/)
})

/**
 * Loan 2 off bronze 2026-09-16 — Lucy Obi's copy of History of Nigeria, one of
 * two out to two different children, which is the case the pupil has to be
 * named for.
 */
const SHARED_TITLE: Row = {
  id: '2',
  book: 'History of Nigeria',
  book_id: '2',
  student: 'Lucy Chinenyenwa Obi',
  student_id: '120',
}

test('the return names the title in the path and the pupil in the body', () => {
  const asked = returnRequest(SHARED_TITLE, 'Good')
  assert.equal(asked?.bookId, '2')
  // A number, not the row's string: the endpoint is given an id, not a label.
  assert.equal(asked?.body.student_id, 120)
  assert.equal(asked?.body.status, 'Good')
})

test('the condition is trimmed, never sent as the spaces somebody typed', () => {
  const asked = returnRequest(SHARED_TITLE, '  Damaged  ')
  assert.equal(asked?.body.status, 'Damaged')
})

test('a row that cannot name the book or the pupil is refused, not posted', () => {
  // Either missing would send the wrong child's copy back, or address a path
  // with a hole in it. Both read as an empty field rather than as an error,
  // which is why this is checked rather than trusted.
  assert.equal(returnRequest({ ...SHARED_TITLE, book_id: '' }, 'Good'), null)
  assert.equal(returnRequest({ ...SHARED_TITLE, student_id: '' }, 'Good'), null)
  assert.equal(returnRequest({ ...SHARED_TITLE, student_id: 'Lucy' }, 'Good'), null)
  assert.equal(returnRequest({ ...SHARED_TITLE, student_id: '0' }, 'Good'), null)
})

/** The fine a return came back with: 18 days late at the school's own rate. */
const LATE_RETURN = {
  loan: { id: 1, source: 'loanedbooks' as const, book_id: 1, student_id: 120 },
  penalty: 900,
  fine: {
    overdue: true,
    due: '2026-08-30',
    returned_on: '2026-09-17',
    days_late: 18,
    rate_per_day: 50,
    amount: 900,
    currency: 'NGN',
    amount_in_words: 'NGN 900.00',
    paid: false,
    collect: { loan_id: 1, book_id: 1, student_id: 120 },
  },
}

test('the fine is collected against what the school says it booked it to', () => {
  // The ids come off the school's own `collect` block, not off the row: it
  // names the loan the fine was just written against, which is the thing the
  // payment has to find.
  const asked = collectRequest(LATE_RETURN, SHARED_TITLE, 900)
  assert.equal(asked?.bookId, '1')
  assert.equal(asked?.body.student_id, 120)
  assert.equal(asked?.body.amount, 900)
})

test('a part payment is sent as what was actually handed over', () => {
  // The school takes a reduction or an instalment, so the desk's figure goes
  // rather than the one it worked out.
  assert.equal(collectRequest(LATE_RETURN, SHARED_TITLE, 500)?.body.amount, 500)
})

test('nothing is collected when the school says nothing is owed', () => {
  // `overdue: false` is the school's own verdict on its own arithmetic, and
  // paying anyway is a 409 on a return that went through perfectly.
  const onTime = { fine: { overdue: false, amount: 0, collect: { book_id: 2, student_id: 120 } } }
  assert.equal(collectRequest(onTime, SHARED_TITLE, 900), null)
})

test('nothing is collected when nobody counted any money', () => {
  assert.equal(collectRequest(LATE_RETURN, SHARED_TITLE, 0), null)
  assert.equal(collectRequest(LATE_RETURN, SHARED_TITLE, Number.NaN), null)
  assert.equal(collectRequest(LATE_RETURN, SHARED_TITLE, -500), null)
})

test('an answer with no fine block falls to the row the return was addressed with', () => {
  // Not a fallback endpoint — the same pair the return itself named. A
  // deployment that sends no block has still taken the book back.
  const asked = collectRequest({}, SHARED_TITLE, 4000)
  assert.equal(asked?.bookId, '2')
  assert.equal(asked?.body.student_id, 120)
})

test('a row that cannot name the book or the pupil takes no money either', () => {
  // A payment posted against a path with a hole in it is money the school
  // cannot attribute.
  assert.equal(collectRequest({}, { ...SHARED_TITLE, book_id: '' }, 4000), null)
  assert.equal(collectRequest({}, { ...SHARED_TITLE, student_id: '' }, 4000), null)
})

test('a loan is keyed on its table as well as its number', () => {
  // Both tables count from 1, so this is the difference between five rows on
  // the register and three.
  assert.equal(loanKey({ id: 1, source: 'loanedbooks' }), 'loanedbooks:1')
  assert.equal(loanKey({ id: 1, source: 'borrowedbooks' }), 'borrowedbooks:1')
  assert.notEqual(
    loanKey({ id: 1, source: 'loanedbooks' }),
    loanKey({ id: 1, source: 'borrowedbooks' }),
  )
  // A deployment that names no table keys as it always did.
  assert.equal(loanKey({ id: 4 }), '4')
})

test('a fine can only be collected where the school can record it', () => {
  // The retired table has no penalty column and no paid column, so a figure
  // against one of its rows is a quotation, not a debt.
  assert.equal(fineTracked({ id: 1, fine_tracked: true }), true)
  assert.equal(fineTracked({ id: 1, fine_tracked: false }), false)
  // Where the flag is missing the table decides, which is the same rule.
  assert.equal(fineTracked({ id: 1, source: 'borrowedbooks' }), false)
  assert.equal(fineTracked({ id: 1, source: 'loanedbooks' }), true)
})

test('a late copy has to be paid for before it goes back', () => {
  // The flow reads this to decide whether the fee box may be left empty, so
  // it is the difference between a fine collected and a fine forgotten.
  assert.equal(fineDue({ ...SHARED_TITLE, standing: 'Overdue' }), true)
})

test('a copy that is out on time, or already back, demands no fee', () => {
  assert.equal(fineDue({ ...SHARED_TITLE, standing: 'Out' }), false)
  // Nothing is being handed over on a loan that is already closed — this is
  // what stops the correction flow asking for money.
  assert.equal(fineDue({ ...SHARED_TITLE, standing: 'Returned' }), false)
  // A row that never said. Demanding a fine on a standing nobody set would
  // block the desk over a missing field.
  assert.equal(fineDue(SHARED_TITLE), false)
})
