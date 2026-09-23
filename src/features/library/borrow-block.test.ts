import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { StudentLoanHistory } from '../../api/library/types.ts'
import { borrowBlock } from './loan-read.ts'

/**
 * Lucy Obi (120) as `GET /loanedbooks/student/120` sent her on 2026-09-16 —
 * one title out, nothing owing, and the flag down because of it.
 */
const BLOCKED: StudentLoanHistory = {
  student_id: 120,
  loans: [],
  borrowed: 1,
  still_out: 1,
  books_out: [{ book_id: 2, title: 'History of Nigeria', loan_id: 2, source: 'borrowedbooks' }],
  fines_owing: 0,
  may_borrow: false,
}

test('the refusal names the book the school named', () => {
  // Not "one is still out against them, or a fine is owing" — the desk's next
  // question is which book, and the answer was already on the wire.
  assert.equal(borrowBlock(BLOCKED), 'They still have History of Nigeria out.')
})

test('a student who may borrow gets no sentence at all', () => {
  assert.equal(borrowBlock({ ...BLOCKED, may_borrow: true }), '')
  // The flag absent is not the flag false: nothing on this answer says no, and
  // the lend endpoint has its own refusal.
  assert.equal(borrowBlock({ loans: [] }), '')
  assert.equal(borrowBlock(null), '')
  assert.equal(borrowBlock(undefined), '')
})

test('more than one out is counted rather than listed', () => {
  const two: StudentLoanHistory = {
    ...BLOCKED,
    still_out: 2,
    books_out: [
      { book_id: 2, title: 'History of Nigeria' },
      { book_id: 5, title: 'Things Fall Apart' },
    ],
  }
  assert.equal(borrowBlock(two), 'They still have 2 books out.')
})

test('a fine is said in money, and beside the book where there is both', () => {
  assert.equal(
    borrowBlock({ ...BLOCKED, books_out: [], still_out: 0, fines_owing: 500 }),
    'A fine of ₦500 is owing.',
  )
  assert.equal(
    borrowBlock({ ...BLOCKED, fines_owing: 500 }),
    'They still have History of Nigeria out. A fine of ₦500 is owing.',
  )
})

test('a no with no reason still says no', () => {
  // The school is entitled to refuse without explaining. Inventing a reason to
  // fill the line is how a portal ends up stating a rule the school does not
  // have.
  assert.equal(
    borrowBlock({ loans: [], may_borrow: false }),
    'The library will not lend to them at the moment.',
  )
})

test('a title the school did not name is still counted', () => {
  // `still_out` is the figure; the list can be short of it.
  assert.equal(
    borrowBlock({ loans: [], may_borrow: false, still_out: 1, books_out: [] }),
    'They still have a book out.',
  )
})
