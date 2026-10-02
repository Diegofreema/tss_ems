import assert from 'node:assert/strict'
import { test } from 'node:test'
import { duration, sittingRows, verdictOf } from './sittings.ts'

/*
 * No sitting has been seen — the document shows the list empty — so these
 * hold the reader to the likeliest spellings and, above all, to the one rule
 * the document states in words: `passed: null` is no opinion, not a fail.
 */

test('a sitting reads its pupil, score, percentage and time, flat or nested', () => {
  const [flat, nested] = sittingRows([
    { id: 5, student_name: 'Ada Obi', regno: 'TSS/2026/5', score: 14, out_of: 20, percentage: 70, passed: true, time_taken_seconds: 312 },
    { id: 6, student: { fname: 'Chidi', lname: 'Eze', regno: 'TSS/2026/6' }, score: 6, out_of: 20, percentage: 30, passed: false },
  ])
  assert.equal(flat.name, 'Ada Obi')
  assert.equal(flat.adm, 'TSS/2026/5')
  assert.equal(flat.score, '14 / 20')
  assert.equal(flat.percent, '70%')
  assert.equal(flat.taken, '5m 12s')
  assert.equal(flat.verdict, 'Passed')
  assert.equal(nested.name, 'Chidi Eze')
  assert.equal(nested.adm, 'TSS/2026/6')
  assert.equal(nested.verdict, 'Failed')
})

test('no pass mark, or nothing to say yet, is never drawn as a fail', () => {
  assert.equal(verdictOf({ passed: null }), 'Marked')
  assert.equal(verdictOf({}), 'Marked')
})

test('a worded time is kept as written', () => {
  const [row] = sittingRows([{ time_taken: '4 minutes' }])
  assert.equal(row.taken, '4 minutes')
  assert.equal(duration(45), '45s')
  assert.equal(duration(120), '2m')
})
