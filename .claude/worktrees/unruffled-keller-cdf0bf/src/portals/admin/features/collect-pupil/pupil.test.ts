import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CollectInvoice } from '../../../../api/collect-fees/types.ts'
import { ledgerRow, owed, pupilResult, pupilSubtitle, pupilTiles } from './pupil.ts'

/** Verbatim from GET /collect-fees/students?q=udo. */
const found = {
  id: 4,
  regno: 'CUN/2026/4',
  fname: 'UDOYE',
  lname: 'OKIGBO',
  department: 'SSS I',
  studentstatus: null,
}

const base: CollectInvoice = {
  id: 2441,
  student_id: 4,
  student: null,
  fee: 'BUS FEE',
  session: '2024/2025',
  amount: 30000,
  paystatus: 'Unpaid',
  is_settled: false,
  payday: null,
  createdate: '2026-08-27T08:03:13+01:00',
  transactions: [],
}

/** Settled at the counter, so a transaction exists behind it. */
const settled: CollectInvoice = {
  ...base,
  id: 2440,
  fee: 'TUITION FEE',
  paystatus: 'success',
  is_settled: true,
  payday: '2026-08-27 09:23:47',
  transactions: [
    {
      id: 16,
      payref: 'MANUAL_CASH_20260827092347_1',
      amount: 30000,
      discount: 0,
      paystatus: 'success',
      method: 'cash',
      notes: null,
      recorded_by: 1,
      transdate: '2026-08-27T09:23:47+01:00',
      invoice_id: 2440,
    },
  ],
}

/** Settled before the counter kept transactions — invoice 1206 really is this. */
const oldSettled: CollectInvoice = {
  ...base,
  id: 1206,
  fee: null,
  session: '2022/2023',
  amount: 218000,
  paystatus: 'success',
  is_settled: true,
  transactions: [],
}

test('a search result names the pupil and how to be sure of them', () => {
  assert.deepEqual(pupilResult(found), {
    id: '4',
    name: 'UDOYE OKIGBO',
    regno: 'CUN/2026/4',
    placed: 'SSS I',
  })
  // The register really does hold pupils with no number on them.
  assert.equal(pupilResult({ ...found, regno: null }).regno, '—')
})

test('a receipt is offered only where a payment was recorded', () => {
  // The endpoint issues one against a transaction, not against `is_settled`.
  assert.equal(ledgerRow(settled).receipt, '2440')
  assert.equal(ledgerRow(oldSettled).receipt, '')
  assert.equal(ledgerRow(base).receipt, '')
})

test('paying is offered on an invoice still owing and on no other', () => {
  assert.equal(ledgerRow(base).payable, '2441')
  assert.equal(ledgerRow(settled).payable, '')
  assert.equal(ledgerRow(oldSettled).payable, '')
})

test('what a pupil owes counts the unsettled invoices alone', () => {
  assert.equal(owed([base, settled, oldSettled]), 30_000)
  assert.equal(owed([settled, oldSettled]), 0)
  assert.equal(owed([]), 0)
})

test('the tiles split the ledger into owing and settled', () => {
  assert.deepEqual(pupilTiles([base, settled, oldSettled]), [
    { label: 'Still owing', value: '₦30,000' },
    { label: 'Invoices owing', value: '1' },
    { label: 'Settled', value: '2' },
  ])
})

test('the ledger heading carries the number and the arm', () => {
  assert.equal(
    pupilSubtitle({ id: 4, regno: 'CUN/2026/4', department: 'SSS I', class_arm: 'JSS 2 A' }),
    'CUN/2026/4 · JSS 2 A',
  )
  // The search endpoint sends no arm, so the class stands in for it.
  assert.equal(pupilSubtitle({ id: 4, regno: 'CUN/2026/4', department: 'SSS I' }), 'CUN/2026/4 · SSS I')
  assert.equal(pupilSubtitle(undefined), '')
})
