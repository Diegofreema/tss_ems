import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ChildMark } from '../../../../api/parents/types.ts'
import { attendanceParams, attendanceTiles, markRow } from './attendance.ts'

const MARK: ChildMark = {
  id: 7,
  attendance_date: '2026-08-27',
  status: 'present',
  notes: '',
}

test('an empty bound is left off, so the endpoint keeps its own default', () => {
  assert.deepEqual(attendanceParams({ start: '', end: '' }), {})
  assert.deepEqual(attendanceParams({ start: '2026-08-01' }), { start_date: '2026-08-01' })
  assert.deepEqual(attendanceParams({ start: '2026-08-01', end: '2026-08-27' }), {
    start_date: '2026-08-01',
    end_date: '2026-08-27',
  })
})

test('a mark carries the day it fell on, in words', () => {
  const row = markRow(MARK)
  assert.equal(row.day, 'Thursday')
  assert.equal(row.state, 'Present')
  assert.match(row.date, /27 Aug 2026/)
  assert.equal(row.note, '—')
})

test('a date the API wrote unreadably leaves the row without a day, not a wrong one', () => {
  const row = markRow({ ...MARK, attendance_date: 'not a date' })
  assert.equal(row.day, '—')
  assert.equal(row.date, 'not a date')
})

test('the rate is the API’s own, counting a late mark as attended', () => {
  assert.deepEqual(
    attendanceTiles({ present: 8, absent: 1, late: 1, excused: 0, total: 10, rate: 90 }),
    [
      { label: 'Days marked', value: '10' },
      { label: 'Present', value: '8' },
      { label: 'Absent', value: '1' },
      { label: 'Attendance', value: '90%' },
    ],
  )
})

test('a range nobody marked has no rate, not nought per cent', () => {
  // A school that took no register is not a child who missed every day.
  const tiles = attendanceTiles({ present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 })
  assert.equal(tiles[3].value, '—')
  assert.equal(attendanceTiles(undefined)[3].value, '—')
})
