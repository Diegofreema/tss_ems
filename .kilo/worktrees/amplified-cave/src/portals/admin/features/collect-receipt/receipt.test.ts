import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Receipt } from '../../../../api/collect-fees/types.ts'
import { receiptLines, receiptTotal } from './receipt.ts'

/** Verbatim from GET /collect-fees/2450/receipt. */
const discounted: Receipt = {
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

/** Verbatim from GET /collect-fees/2440/receipt. */
const plain: Receipt = {
  ...discounted,
  reference: 'MANUAL_CASH_20260827092347_1',
  issued_at: '2026-08-27T09:23:47+01:00',
  amount: 30000,
  discount: 0,
  method: 'cash',
  notes: null,
  student: { id: 4, regno: 'CUN/2026/4', name: 'UDOYE OKIGBO', department: 'SSS I' },
}

const METHODS = { cash: 'Cash', bank_transfer: 'Bank Transfer', pos: 'POS', cheque: 'Cheque' }

test('the slip reads in the order a receipt is read', () => {
  const lines = receiptLines(discounted, METHODS)
  assert.deepEqual(lines.map((line) => line.label), [
    'Student',
    'Reg. no.',
    'Class',
    'Fee',
    'Session',
    'Method',
    'Discount granted',
    'Invoice settled for',
    'Received',
    'Note',
  ])
  assert.equal(lines[0].value, 'OKONKWO ARINZE')
  assert.equal(lines[5].value, 'Bank Transfer')
  assert.equal(lines[6].value, '₦6,000')
  assert.equal(lines[7].value, '₦30,000')
  assert.equal(lines[8].value, '27 Aug 2026, 12:56')
})

test('a slip with nothing waived and nothing written says neither', () => {
  // "Discount ₦0" invites the question of why the line is there at all.
  const labels = receiptLines(plain, METHODS).map((line) => line.label)
  assert.equal(labels.includes('Discount granted'), false)
  assert.equal(labels.includes('Note'), false)
})

test('the figure on the slip is what was handed over', () => {
  // Not what the invoice was closed for — a discount is not money taken.
  assert.equal(receiptTotal(discounted), '₦24,000')
  assert.equal(receiptTotal(plain), '₦30,000')
  assert.equal(receiptTotal(undefined), '₦0')
})

test('nothing to show renders no lines at all', () => {
  assert.deepEqual(receiptLines(undefined), [])
})
