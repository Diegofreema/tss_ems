import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Mark } from '../../../../api/results/types.ts'
import { marksOf, resultRows, termAverage, termOf } from './results.ts'

/**
 * One released mark. The four parts are the shape `POST /results` writes and
 * the guardian's endpoint already returns; the expansions are what the
 * sibling routes send off the same table.
 */
const RESULT: Mark = {
  id: 41,
  student_id: 483,
  subject_id: 3,
  first_ca: '15.00',
  second_ca: '11.00',
  homework_project: '0.00',
  first_exam: '52.00',
  total: '78.00',
  grade: 'A',
  remark: 'Excellent',
  approval_status: 'approved',
  uploaddate: '2026-08-27T09:23:47+01:00',
  session: { id: 8, name: '2024/2025' },
  semester: { id: 1, name: 'First Term' },
  subject: { id: 3, name: 'Mathematics' },
  department: { id: 2, name: 'SSS I' },
}

test('a mark reads as the sheet has it, with the parts on the panel', () => {
  const [row] = resultRows([RESULT])
  assert.equal(row?.subject, 'Mathematics')
  assert.equal(row?.term, 'First Term · 2024/2025')
  assert.equal(row?.exam, '52')
  assert.equal(row?.total, '78')
  assert.equal(row?.grade, 'A')
  assert.equal(row?.firstCa, '15')
  assert.equal(row?.secondCa, '11')
  assert.equal(row?.homework, '0')
})

test('a mark filed the older way still reads', () => {
  // `teachers/me/scores` files a two-column mark into the same table, so a
  // pupil's sheet can hold both shapes at once.
  const [row] = resultRows([
    { ...RESULT, first_ca: null, first_exam: null, ca: '26.00', score: '52.00' },
  ])
  assert.equal(row?.firstCa, '26')
  assert.equal(row?.exam, '52')
})

test('a mark whose subject was not expanded is still nameable', () => {
  const [row] = resultRows([{ ...RESULT, subject: null }])
  assert.equal(row?.subject, 'Subject 3')
})

test('a mark with no term on it says so rather than reading as one', () => {
  assert.equal(termOf({ ...RESULT, session: null, semester: null }), '—')
  assert.equal(termOf({ ...RESULT, semester: null }), '2024/2025')
})

test('the newest mark is the one at the top', () => {
  const rows = resultRows([
    { ...RESULT, id: 12 },
    { ...RESULT, id: 41 },
    { ...RESULT, id: 30 },
  ])
  assert.deepEqual(rows.map((row) => row.id), ['41', '30', '12'])
})

test('the marks are found whichever key the envelope carries them under', () => {
  assert.deepEqual(marksOf({ results: [RESULT] }), [RESULT])
  assert.deepEqual(marksOf({ marks: [RESULT] }), [RESULT])
  assert.deepEqual(marksOf({ rows: [RESULT], average: 78 }), [RESULT])
  assert.deepEqual(marksOf(undefined), [])
  assert.deepEqual(marksOf({ average: 0 }), [])
})

test('the term average is read beside the marks, or not at all', () => {
  assert.equal(termAverage({ average: 78.5 }), 78.5)
  assert.equal(termAverage({ summary: { average: '78.50' } }), 78.5)
  assert.equal(termAverage({ term_average: 61 }), 61)
  // Nothing rather than nought: a pupil shown "0" for a term nobody has
  // marked them in has been told something false about themselves.
  assert.equal(termAverage({ results: [] }), undefined)
  assert.equal(termAverage(undefined), undefined)
})

test('no marks is no rows', () => {
  assert.deepEqual(resultRows([]), [])
})
