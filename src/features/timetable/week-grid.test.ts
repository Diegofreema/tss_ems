import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ClassTimetable, Period } from '../../api/timetables/types.ts'
import { lengthOf, mineTally, periodTally, weekGrid } from './week-grid.ts'

/**
 * The two payloads bronze actually sends, cut down to what the grid reads:
 * class 1, which holds the school's only periods (both Monday, First Term),
 * and the student's own class 2, which holds none.
 */
const JSS1 = {
  class: { id: 1, name: 'JSS 1' },
  session: { id: 8, name: '2024/2025' },
  semester: { id: 1, name: 'First Term' },
  period_count: 2,
  message: null,
  days: [
    {
      day: 'Monday',
      periods: [
        // Sent out of time order by the API, as class 1 really is.
        {
          id: 15,
          subject_id: 7,
          label: 'IGBO LANGUAGE',
          day_of_week: 'Monday',
          start_time: '11:58',
          end_time: '12:58',
        },
        {
          id: 14,
          subject_id: 1,
          label: 'ENGLISH LANGUAGE',
          day_of_week: 'Monday',
          start_time: '08:56',
          end_time: '10:56',
        },
      ],
    },
    { day: 'Tuesday', periods: [] },
    { day: 'Wednesday', periods: [] },
    { day: 'Thursday', periods: [] },
    { day: 'Friday', periods: [] },
  ],
} as unknown as ClassTimetable

const EMPTY = {
  class: { id: 2, name: 'SSS I' },
  class_arm: 'JSS 2 A',
  session: { id: 8, name: '2024/2025' },
  semester: { id: 1, name: 'First Term' },
  period_count: 0,
  message: 'No timetable has been entered for this class yet.',
  days: [
    { day: 'Monday', periods: [] },
    { day: 'Tuesday', periods: [] },
    { day: 'Wednesday', periods: [] },
    { day: 'Thursday', periods: [] },
    { day: 'Friday', periods: [] },
  ],
} as unknown as ClassTimetable

/** What a portal knows and the timetable endpoint does not. */
const TEACHERS: Record<number, string> = { 1: 'Ngozi Okafor' }
const named = (period: Period) => ({ teacher: TEACHERS[period.subject_id ?? 0] })

/** The signed-in teacher takes English and nothing else. */
const ownEnglish = (period: Period) => ({ mine: period.subject_id === 1 })

/** A Wednesday, so "today" is a column that holds nothing. */
const WEDNESDAY = new Date(2026, 8, 2, 9, 0)

test('draws a column per school day, in the order the API sent them', () => {
  const week = weekGrid(JSS1, WEDNESDAY, named)
  assert.deepEqual(
    week.map((column) => column.day),
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  )
})

test('stacks a day’s periods in time order, however they arrived', () => {
  const [monday] = weekGrid(JSS1, WEDNESDAY, named)
  assert.deepEqual(
    monday.periods.map((period) => period.subject),
    ['ENGLISH LANGUAGE', 'IGBO LANGUAGE'],
  )
  assert.equal(monday.periods[0].time, '08:56 – 10:56')
})

test('joins the teacher on by subject id, and marks the one it cannot', () => {
  const [monday] = weekGrid(JSS1, WEDNESDAY, named)
  assert.equal(monday.periods[0].teacher, 'Ngozi Okafor')
  assert.equal(monday.periods[1].teacher, '—')
})

test('dates the columns from this week and marks today', () => {
  const week = weekGrid(JSS1, WEDNESDAY, named)
  assert.deepEqual(
    week.map((column) => column.date),
    ['31 Aug', '1 Sep', '2 Sep', '3 Sep', '4 Sep'],
  )
  assert.deepEqual(
    week.map((column) => column.today),
    [false, false, true, false, false],
  )
})

test('a period on a day the payload opened no column for still shows', () => {
  const saturday = {
    ...JSS1,
    days: [
      { day: 'Monday', periods: [] },
      {
        day: 'Monday',
        periods: [
          { id: 99, label: 'GAMES', day_of_week: 'Saturday', start_time: '10:00' },
        ],
      },
    ],
  } as unknown as ClassTimetable
  const week = weekGrid(saturday, WEDNESDAY, named)
  const extra = week.at(-1)
  assert.equal(extra?.day, 'Saturday')
  assert.equal(extra?.periods[0].subject, 'GAMES')
})

test('an empty class keeps its five columns and counts nothing', () => {
  const week = weekGrid(EMPTY, WEDNESDAY, named)
  assert.equal(week.length, 5)
  assert.equal(periodTally(week), 0)
})

test('counts every period of the week', () => {
  assert.equal(periodTally(weekGrid(JSS1, WEDNESDAY, named)), 2)
})

test('says how long a period runs, and nothing where it cannot', () => {
  assert.equal(lengthOf({ id: 1, start_time: '08:56', end_time: '10:56' }), '2 hr')
  assert.equal(lengthOf({ id: 1, start_time: '08:00', end_time: '08:40' }), '40 min')
  assert.equal(lengthOf({ id: 1, start_time: '08:00', end_time: '09:30' }), '1 hr 30 min')
  assert.equal(lengthOf({ id: 1, start_time: '08:00', end_time: null }), '')
  // An end before its start is the office's typo, not a negative period.
  assert.equal(lengthOf({ id: 1, start_time: '10:00', end_time: '09:00' }), '')
})

test('marks the reader\u2019s own periods, and leaves the question unasked elsewhere', () => {
  const [mondayForTeacher] = weekGrid(JSS1, WEDNESDAY, ownEnglish)
  assert.deepEqual(
    mondayForTeacher.periods.map((period) => period.mine),
    [true, false],
  )
  assert.equal(mineTally(weekGrid(JSS1, WEDNESDAY, ownEnglish)), 1)

  // A student's own grid never asks whose a period is, so nothing is marked and
  // nothing is stepped back either.
  const [mondayForStudent] = weekGrid(JSS1, WEDNESDAY, named)
  assert.deepEqual(
    mondayForStudent.periods.map((period) => period.mine),
    [undefined, undefined],
  )
  assert.equal(mineTally(weekGrid(JSS1, WEDNESDAY, named)), 0)
})
