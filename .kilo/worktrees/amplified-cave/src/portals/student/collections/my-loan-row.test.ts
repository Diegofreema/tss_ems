import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Loan } from '../../../api/library/types.ts'
import { myLoanRow } from './my-loan-row.ts'

/**
 * The flat shape the loan controller sends, read off bronze on 2026-09-15 —
 * `/loanedbooks` and `/loanedbooks/{id}` alike, and `/loanedbooks/mine` is the
 * same controller. It replaces a fixture written from the 2026-09-03 contract,
 * whose field names (`book_title`, `due_date`, `returned: 'Yes'`) nothing
 * sends; see the note in the office's `loan-row.test.ts`.
 */
const LOAN: Loan = {
  id: 4,
  book: 'Things Fall Apart',
  book_id: 1,
  borrowed: '2026-08-20',
  due: '2026-08-30',
  overdue: true,
  returned: false,
  paid: false,
  penalty: 250,
  penalty_if_returned_today: 250,
  student_id: 120,
}

const TODAY = new Date('2026-09-03T09:00:00+01:00')

test('a student reads their own loan without a student column', () => {
  const row = myLoanRow(LOAN, TODAY)
  assert.equal(row.book, 'Things Fall Apart')
  assert.equal(row.borrowed, '20 Aug 2026')
  assert.equal(row.due, '30 Aug 2026')
  assert.equal(row.standing, 'Overdue')
  assert.equal(row.fine, '₦250')
  assert.equal(row.paid, 'Owing')
  assert.equal('student' in row, false)
})

test('a returned loan reads settled', () => {
  const row = myLoanRow(
    { ...LOAN, returned: true, paid: true, returned_on: '2026-09-01', condition: 'Good' },
    TODAY,
  )
  assert.equal(row.standing, 'Returned')
  assert.equal(row.paid, 'Paid')
  assert.equal(row.returned_on, '01 Sept 2026')
  assert.equal(row.condition, 'Good')
})

test('a loan with no fine shows neither figure nor owing', () => {
  // `paid` is `true` on a loan that never owed anything, so the figure decides.
  const row = myLoanRow({ ...LOAN, overdue: false, penalty: 0, paid: true }, TODAY)
  assert.equal(row.standing, 'Out')
  assert.equal(row.fine, '—')
  assert.equal(row.paid, '—')
})
