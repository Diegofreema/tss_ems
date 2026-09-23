import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CollectionsReport } from '../../../../api/collect-fees/types.ts'
import {
  ANY_METHOD,
  methodRows,
  rangeLabel,
  reportParams,
  reportTiles,
} from './report.ts'

/** Verbatim from GET /collect-fees/reports. */
const report: CollectionsReport = {
  range: { from: '2026-08-01', to: '2026-08-27', payment_method: null },
  totals: { amount: 54000, discount: 6000, entries: 2 },
  by_method: {
    cash: { amount: 30000, discount: 0, entries: 1 },
    bank_transfer: { amount: 24000, discount: 6000, entries: 1 },
    pos: { amount: 0, discount: 0, entries: 0 },
    cheque: { amount: 0, discount: 0, entries: 0 },
  },
  payments: [],
}

const METHODS = { cash: 'Cash', bank_transfer: 'Bank Transfer', pos: 'POS', cheque: 'Cheque' }

test('an unset filter is left off rather than sent empty', () => {
  // The endpoint defaults an empty range to the current month, which beats
  // anything this page could invent.
  assert.deepEqual(reportParams({ start: '', end: '', method: '' }), {})
  assert.deepEqual(reportParams({ method: ANY_METHOD }), {})
  assert.deepEqual(reportParams({ start: '2026-08-01', method: 'cash' }), {
    start_date: '2026-08-01',
    payment_method: 'cash',
  })
})

test('the tiles separate money taken from money given up', () => {
  assert.deepEqual(reportTiles(report.totals), [
    { label: 'Collected', value: '₦54,000' },
    { label: 'Discounted', value: '₦6,000' },
    { label: 'Payments', value: '2' },
  ])
  // A range with nothing in it still renders three tiles, at zero.
  assert.equal(reportTiles(undefined)[0].value, '₦0')
})

test('methods with nothing against them are left out of the breakdown', () => {
  // The API returns all four every time; three empty rows under one real one
  // read as a fault rather than as a quiet week.
  const rows = methodRows(report, METHODS)
  assert.deepEqual(rows.map((row) => row.method), ['Cash', 'Bank Transfer'])
  assert.equal(rows[1].amount, '₦24,000')
  assert.equal(rows[1].discount, '₦6,000')
  assert.equal(rows[1].entries, '1')
  assert.deepEqual(methodRows(undefined), [])
})

test('the range shown is the one the API used', () => {
  // It defaults an empty range and swaps one given backwards, so the page
  // reads the dates back off the answer rather than off the question.
  assert.equal(rangeLabel(report), '01 Aug 2026 — 27 Aug 2026')
  assert.equal(
    rangeLabel({ ...report, range: { from: '2026-08-27', to: '2026-08-27', payment_method: null } }),
    '27 Aug 2026',
  )
  assert.equal(rangeLabel(undefined), 'this month')
})
