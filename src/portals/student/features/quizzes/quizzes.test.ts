import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PupilQuiz } from '../../../../api/quizzes/pupil.ts'
import { quizRows, quizTally, stateOf } from './quizzes.ts'

const OPEN: PupilQuiz = {
  id: 13,
  name: 'Week 4 mental maths',
  subject: 'MATHEMATICS',
  minutes: 10,
  passMark: 50,
  marks: 20,
  asks: 10,
  opens: '2026-10-02 08:00',
  closes: '2026-10-04 00:00',
  status: 'active',
  sat: false,
  started: false,
}

const NOW = new Date('2026-10-02T09:00:00').getTime()

test('a quiz is open, begun, sat or shut — sat wins over everything', () => {
  assert.equal(stateOf(OPEN, NOW), 'Open')
  assert.equal(stateOf({ ...OPEN, started: true }, NOW), 'Carry on')
  assert.equal(stateOf({ ...OPEN, sat: true, closes: '2026-10-01 00:00' }, NOW), 'Sat')
  // Listed this morning, closed by the time the device shows it.
  assert.equal(stateOf({ ...OPEN, closes: '2026-10-02 08:30' }, NOW), 'Closed')
})

test('a paper already begun comes first, then what can be started, then what is done', () => {
  const rows = quizRows(
    [
      { ...OPEN, id: 1, sat: true },
      { ...OPEN, id: 2 },
      { ...OPEN, id: 3, started: true },
    ],
    NOW,
  )
  assert.deepEqual(rows.map((row) => row.id), ['3', '2', '1'])
  assert.deepEqual(quizTally(rows), { open: 2, sat: 1 })
  assert.equal(rows[1].clock, '10 min')
})

test('a quiz with no clock says so', () => {
  assert.equal(quizRows([{ ...OPEN, minutes: null }], NOW)[0].clock, 'No clock')
})
