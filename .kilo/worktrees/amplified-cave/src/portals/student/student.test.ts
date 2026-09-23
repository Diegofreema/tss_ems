import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Invoice } from '../../api/invoices/types.ts'
import type { Student } from '../../api/my-schooling/types.ts'
import { armOf, feeStanding } from './student.ts'

const STUDENT = {
  class_arm: { id: 4, arm_name: 'JSS 2 A' },
  department: { id: 2, name: 'SSS I' },
} as unknown as Student

/** `paid` bills first, then `owing` ones — the ledger the student's own list returns. */
const ledger = (paid: number, owing = 0): Invoice[] => [
  ...Array.from({ length: paid }, (_, i) => ({ id: i + 1, paystatus: 'success' })),
  ...Array.from({ length: owing }, (_, i) => ({ id: 100 + i, paystatus: 'Unpaid' })),
] as Invoice[]

test('the arm is what the student is shown as, with the class behind it', () => {
  assert.equal(armOf(STUDENT), 'JSS 2 A')
  assert.equal(armOf({ ...STUDENT, class_arm: undefined } as Student), 'SSS I')
})

test('nothing owing reads as cleared', () => {
  assert.deepEqual(feeStanding(ledger(3)), { label: 'Fees cleared', owing: false })
})

test('what is owed is counted, and one bill is not "1 invoices"', () => {
  assert.deepEqual(feeStanding(ledger(3, 1)), { label: '1 invoice unpaid', owing: true })
  assert.equal(feeStanding(ledger(1, 3))?.label, '3 invoices unpaid')
})

test('no answer yet says nothing, rather than saying cleared', () => {
  assert.equal(feeStanding(undefined), null)
  assert.equal(feeStanding([]), null)
})

test('the tag counts the student’s own bills, not the dashboard’s counters', () => {
  // Student 4's dashboard says one invoice is unpaid; their ledger — and the
  // office's, which holds the same three rows — is settled in full. The bill
  // the counter names is another student's, and this tag must not repeat it.
  assert.equal(feeStanding(ledger(3))?.owing, false)
})
