import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fromApiDate, rangeLabel, toApiDate } from './date-range.ts'

test('a date goes as the calendar shows it, not as UTC', () => {
  // toISOString on a date picked east of Greenwich sends the day before.
  assert.equal(toApiDate(new Date(2026, 7, 1)), '2026-08-01')
  assert.equal(toApiDate(new Date(2026, 11, 31)), '2026-12-31')
  assert.equal(toApiDate(undefined), undefined)
  assert.equal(toApiDate(new Date('nonsense')), undefined)
})

test('a date off the query string comes back to the same day', () => {
  const back = fromApiDate('2026-08-27')
  assert.equal(back?.getFullYear(), 2026)
  assert.equal(back?.getMonth(), 7)
  assert.equal(back?.getDate(), 27)
  assert.equal(fromApiDate(''), undefined)
  assert.equal(fromApiDate('nonsense'), undefined)
})

test('a range reads as the days it covers', () => {
  assert.equal(rangeLabel('2026-08-01', '2026-08-27'), '01 Aug 2026 — 27 Aug 2026')
  // The endpoint is inclusive at both ends, so one day is a real answer.
  assert.equal(rangeLabel('2026-08-27', '2026-08-27'), '27 Aug 2026')
})

test('half a range says which half it is', () => {
  // Both ends are optional and the endpoint treats a missing one as open, so
  // the label names the end that is set rather than trailing a dash.
  assert.equal(rangeLabel('2026-08-28', ''), 'From 28 Aug 2026')
  assert.equal(rangeLabel('', '2026-08-27'), 'Until 27 Aug 2026')
  assert.equal(rangeLabel('', ''), '')
})
