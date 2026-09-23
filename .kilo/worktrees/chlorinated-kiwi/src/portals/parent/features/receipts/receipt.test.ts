import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Receipt } from '../../../../api/collect-fees/types.ts'
import type { Parent } from '../../../../api/parents/types.ts'
import { paidBy, receiptFields } from './receipt.ts'

/** Verbatim from GET /collect-fees/2450/receipt — the one with a discount. */
const RECEIPT: Receipt = {
  reference: 'MANUAL_BANK_TRANSFER_20260827125613_1',
  issued_at: '2026-08-27T12:56:13+01:00',
  school: 'NETPRO LMS BRONZE',
  session: '2024/2025',
  fee: 'TUITION FEE',
  amount: 24000,
  discount: 6000,
  total_settled: 30000,
  method: 'bank_transfer',
  notes: 'Transfer ref 99881',
  student: { id: 16, regno: 'NETPRO/2026/16', name: 'OKONKWO ARINZE', department: 'JSS 1' },
}

const HOUSEHOLD = {
  fathersname: 'Udoye Okagbue',
  mothersname: 'Mgbeke Nuche',
} as Parent

const METHODS = { cash: 'Cash', bank_transfer: 'Bank Transfer' }

test('the household is named as the school holds it, both guardians where it has both', () => {
  assert.equal(paidBy(HOUSEHOLD), 'Udoye Okagbue & Mgbeke Nuche')
  assert.equal(paidBy({ fathersname: 'Udoye Okagbue' } as Parent), 'Udoye Okagbue')
  assert.equal(paidBy({ mothersname: ' ' } as Parent), 'This household')
  assert.equal(paidBy(undefined), 'This household')
})

test('a discounted payment says what was waived and what the bill was closed for', () => {
  assert.deepEqual(receiptFields(RECEIPT, HOUSEHOLD, METHODS), [
    { label: 'Received from', value: 'Udoye Okagbue & Mgbeke Nuche' },
    { label: 'On behalf of', value: 'OKONKWO ARINZE' },
    { label: 'For', value: 'TUITION FEE' },
    { label: 'Session', value: '2024/2025' },
    { label: 'Method', value: 'Bank Transfer' },
    { label: 'Date', value: '27 Aug 2026, 12:56' },
    { label: 'Discount granted', value: '₦6,000' },
    { label: 'Invoice settled for', value: '₦30,000' },
    { label: 'Note', value: 'Transfer ref 99881' },
  ])
})

test('a payment in full says neither, because both would be saying the amount twice', () => {
  const plain: Receipt = {
    ...RECEIPT,
    amount: 30000,
    discount: 0,
    total_settled: 30000,
    method: 'cash',
    notes: null,
  }
  assert.deepEqual(
    receiptFields(plain, HOUSEHOLD, METHODS).map((field) => field.label),
    ['Received from', 'On behalf of', 'For', 'Session', 'Method', 'Date'],
  )
})

test('a method taken before the list loaded is shown as the API sent it', () => {
  assert.equal(receiptFields(RECEIPT, HOUSEHOLD)[4].value, 'bank_transfer')
})
