import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  attendanceRate,
  attendanceRows,
  countOf,
  daysMarked,
  marksOf,
} from './attendance.ts'

const answer = {
  attendance: [
    { id: 1, attendance_date: '2026-08-31', status: 'present', notes: null },
    { id: 2, attendance_date: '2026-09-01', status: 'late', notes: 'Bus was late' },
  ],
  stats: { present: 1, absent: 0, late: 1, excused: 0, total: 2, rate: 100 },
}

test('the register reads whichever key the endpoint hangs it on', () => {
  assert.equal(marksOf(answer).length, 2)
  assert.equal(marksOf({ records: answer.attendance }).length, 2)
  assert.equal(marksOf(answer.attendance).length, 2)
  assert.equal(marksOf(undefined).length, 0)
})

test('days come back newest first', () => {
  assert.deepEqual(
    attendanceRows(answer).map((row) => row.state),
    ['Late', 'Present'],
  )
})

test('a mark with nothing beside it still fills its cells', () => {
  const [row] = attendanceRows({ attendance: [{ attendance_date: '2026-08-31' }] })
  assert.equal(row.state, '—')
  assert.equal(row.note, '—')
  assert.equal(row.day, 'Monday')
})

test('the rate is the school’s own figure, not one worked out here', () => {
  // 1 present + 1 late over 2 days is 100% only because the school counts late
  // as being in school. Nothing here recomputes that.
  assert.equal(attendanceRate(answer), 100)
})

test('a pupil nobody has marked has no rate rather than nought per cent', () => {
  assert.equal(attendanceRate({ attendance: [], stats: { total: 0, rate: 0 } }), undefined)
  assert.equal(daysMarked({ attendance: [] }), 0)
})

test('counts fall back to the rows where the summary does not carry them', () => {
  assert.equal(countOf(answer, 'present'), 1)
  assert.equal(countOf({ attendance: answer.attendance }, 'late'), 1)
  assert.equal(countOf({ attendance: answer.attendance }, 'absent'), 0)
})
