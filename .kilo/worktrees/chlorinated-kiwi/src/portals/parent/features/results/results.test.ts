import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ChildResult } from '../../../../api/parents/types.ts'
import { mark, resultParams, resultRow, resultTiles } from './results.ts'

/** Verbatim from GET /sparents/my-children/4/results. */
const RESULT: ChildResult = {
  id: 2,
  subject: 'MATHEMATICS',
  first_ca: '0.00',
  second_ca: '0.00',
  first_exam: '18.00',
  ca: '8',
  score: '77.00',
  total: '85',
  grade: 'A',
  remark: null,
  session: '2024/2025',
  semester: 'First Term',
}

test('a mark is read in whole marks, not in the decimals the API stores', () => {
  assert.equal(mark('18.00'), '18')
  assert.equal(mark('77.50'), '77.5')
  assert.equal(mark('0.00'), '0')
  // Nothing on record is not a nought somebody could mistake for a score.
  assert.equal(mark(null), '—')
  assert.equal(mark('  '), '—')
  // Anything unreadable is shown as it was sent rather than as a figure.
  assert.equal(mark('absent'), 'absent')
})

test('an unset filter is left off rather than sent empty', () => {
  // A blank session_id is read as no session at all, and answers with nothing.
  assert.deepEqual(resultParams({ session: '', term: '' }), {})
  assert.deepEqual(resultParams({ session: null, term: undefined }), {})
  assert.deepEqual(resultParams({ session: '8' }), { session_id: 8 })
  assert.deepEqual(resultParams({ session: '8', term: '1' }), {
    session_id: 8,
    semester_id: 1,
  })
})

test('the register shows the three marks that add up', () => {
  const row = resultRow(RESULT)
  // ca + exam is what the API calls total, and the table says all three.
  assert.equal(row.ca, '8')
  assert.equal(row.exam, '77')
  assert.equal(row.total, '85')
  assert.equal(Number(row.ca) + Number(row.exam), Number(row.total))
  assert.equal(row.subject, 'MATHEMATICS')
  assert.equal(row.grade, 'A')
  assert.equal(row.remark, '—')
})

test('the parts a mark was built from are on the record, not in the table', () => {
  const row = resultRow(RESULT)
  assert.equal(row.firstCa, '0')
  assert.equal(row.secondCa, '0')
  assert.equal(row.firstExam, '18')
  assert.equal(row.session, '2024/2025')
  assert.equal(row.term, 'First Term')
})

test('the tiles are the API’s own figures, so they cannot contradict the sheet', () => {
  assert.deepEqual(resultTiles({ subjects: 1, total_marks: 85, average: 85 }), [
    { label: 'Subjects', value: '1' },
    { label: 'Total marks', value: '85' },
    { label: 'Average', value: '85' },
  ])
})

test('a term with nothing approved has no average, rather than an average of nought', () => {
  const tiles = resultTiles({ subjects: 0, total_marks: 0, average: 0 })
  assert.equal(tiles[2].value, '—')
  // And a sheet that has not answered yet reads the same way.
  assert.equal(resultTiles(undefined)[2].value, '—')
})
