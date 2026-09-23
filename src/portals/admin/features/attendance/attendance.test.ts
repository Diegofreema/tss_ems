import assert from 'node:assert/strict'
import { test } from 'node:test'
import type {
  AttendanceDashboard,
  AttendanceDepartment,
  AttendanceRecord,
  AttendanceReport,
} from '../../../../api/attendance/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import {
  ANY,
  classCountRow,
  classOptions,
  coveringLabel,
  dashboardTiles,
  dayTotals,
  exportFilename,
  rate,
  recordRow,
  reportParams,
  reportTiles,
} from './attendance.ts'

/** `GET /admin-attendances?date=2026-08-27` exactly as bronze answers it. */
const DASHBOARD: AttendanceDashboard = {
  date: '2026-08-27',
  today: [
    { department_id: 1, class_arm_id: 10, department_name: 'JSS 1 - B', total_students: 0, present_count: 0 },
    { department_id: 1, class_arm_id: 3, department_name: 'JSS 1 - JSS1 A', total_students: 4, present_count: 3 },
    { department_id: 8, class_arm_id: null, department_name: 'SS1', total_students: 0, present_count: 0 },
    { department_id: 2, class_arm_id: 4, department_name: 'SSS I - JSS 2 A', total_students: 2, present_count: 0 },
  ],
  overall: { present: 3, absent: 0, late: 0, excused: 0, total_records: 3 },
}

/** `GET /admin-attendances/report` as bronze answers it. */
const REPORT: AttendanceReport = {
  filters: {
    department_id: null,
    class_arm_id: null,
    start_date: '2026-08-01',
    end_date: '2026-08-29',
    status: null,
  },
  stats: { present: 3, absent: 0, late: 0, excused: 0, total: 3 },
  records: [
    {
      id: 6,
      attendance_date: '2026-08-27',
      status: 'present',
      notes: '',
      student: {
        id: 10,
        regno: 'MGS/2020535',
        name: 'Aniegbokas Chukwudi',
        department: 'JSS 1',
        class_arm: 'JSS1 A',
      },
      teacher: { id: 2, name: 'Teacher u 1 New Teacher' },
    },
  ],
  pagination: { page: 1, limit: 8, total: 3, pages: 1 },
}

test('the day’s totals are added off the classes, not off `overall`', () => {
  // `overall` is every record the school has ever taken and does not move with
  // the date, so a day's figures can only come from `today`.
  assert.deepEqual(dayTotals(DASHBOARD.today), { roll: 6, present: 3 })
  const tiles = dashboardTiles(DASHBOARD)
  assert.deepEqual(tiles.map((tile) => tile.value), ['6', '3', '50%'])
})

test('a class with nobody on the roll has no rate rather than 0%', () => {
  assert.equal(rate(0, 0), BLANK)
  assert.equal(rate(0, 4), '0%')
  assert.equal(rate(3, 4), '75%')
})

test('a class row is keyed by its arm, so two arms of one class do not collide', () => {
  const [b, a] = DASHBOARD.today.map(classCountRow)
  assert.equal(b.id, '1-10')
  assert.equal(a.id, '1-3')
  assert.equal(a.klass, 'JSS 1 - JSS1 A')
  assert.equal(a.rate, '75%')
  // A class with no arms still gets an id of its own.
  assert.equal(classCountRow(DASHBOARD.today[2]).id, '8-none')
})

test('a mark reads its student, class and arm as one line', () => {
  const row = recordRow(REPORT.records[0])
  assert.equal(row.when, '27 Aug 2026')
  assert.equal(row.student, 'Aniegbokas Chukwudi')
  assert.equal(row.adm, 'MGS/2020535')
  assert.equal(row.klass, 'JSS 1 · JSS1 A')
  assert.equal(row.status, 'Present')
  assert.equal(row.marked, 'Teacher u 1 New Teacher')
  // An empty note is a blank cell, not an empty string that reads as missing.
  assert.equal(row.notes, BLANK)
})

test('a student with no admission number yet reads blank', () => {
  const record: AttendanceRecord = {
    ...REPORT.records[0],
    student: { ...REPORT.records[0].student, regno: null, class_arm: null },
    teacher: null,
  }
  const row = recordRow(record)
  assert.equal(row.adm, BLANK)
  assert.equal(row.klass, 'JSS 1')
  assert.equal(row.marked, BLANK)
})

test('the breakdown is the four statuses, in register order', () => {
  assert.deepEqual(
    reportTiles(REPORT).map((tile) => `${tile.label} ${tile.value}`),
    ['Present 3', 'Absent 0', 'Late 0', 'Excused 0'],
  )
})

test('the sentinels and the blanks are left off what is asked for', () => {
  assert.deepEqual(reportParams({ start: '', end: '', klass: ANY, arm: ANY, status: ANY }), {})
  assert.deepEqual(
    reportParams({ start: '2026-08-01', end: '2026-08-29', klass: '1', arm: '3', status: 'absent' }),
    {
      start_date: '2026-08-01',
      end_date: '2026-08-29',
      department_id: 1,
      class_arm_id: 3,
      status: 'absent',
    },
  )
})

test('the page says the dates the endpoint used, not the ones it was given', () => {
  // An empty range comes back filled in with the current month.
  assert.equal(coveringLabel(REPORT), '01 Aug 2026 — 29 Aug 2026')
  assert.equal(coveringLabel(undefined), 'this month')
})

test('the file is named for the range it holds, so two exports do not collide', () => {
  assert.equal(exportFilename(REPORT), 'attendance_2026-08-01_2026-08-29.csv')
  const oneDay = { ...REPORT, filters: { ...REPORT.filters, start_date: '2026-08-27', end_date: '2026-08-27' } }
  assert.equal(exportFilename(oneDay), 'attendance_2026-08-27.csv')
  assert.equal(exportFilename(undefined), 'attendance_all.csv')
})

test('two classes with the same name are told apart, and the rest are left alone', () => {
  // Bronze really does hold two classes named SSS I, both coded SSS I.
  const departments: AttendanceDepartment[] = [
    { id: 1, name: 'JSS 1', deptcode: 'JSS 1' },
    { id: 2, name: 'SSS I', deptcode: 'SSS I' },
    { id: 6, name: 'SSS I', deptcode: 'SSS I' },
    { id: 7, name: 'SSS II', deptcode: 'SS2' },
  ]
  assert.deepEqual(classOptions(departments).map((one) => one.label), [
    'JSS 1',
    'SSS I · #2',
    'SSS I · #6',
    // Unique already — the code it does not need is not bolted on.
    'SSS II',
  ])
})

test('a repeated name uses the code where the code says something new', () => {
  const departments: AttendanceDepartment[] = [
    { id: 3, name: 'Alpha', deptcode: 'A-DAY' },
    { id: 4, name: 'Alpha', deptcode: 'A-EVE' },
  ]
  assert.deepEqual(classOptions(departments).map((one) => one.label), [
    'Alpha · A-DAY',
    'Alpha · A-EVE',
  ])
})
