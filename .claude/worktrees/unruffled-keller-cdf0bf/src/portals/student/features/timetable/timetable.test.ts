import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { MyCourses } from '../../../../api/my-schooling/types.ts'
import type { ClassTimetable } from '../../../../api/timetables/types.ts'
import { labelOf, timeRange } from '../../../../features/timetable/week-grid.ts'
import { weekPeriods } from '../../../../features/timetable/week.ts'
import { classOf, periodRows, teacherFor } from './timetable.ts'

/** Two periods off `GET /timetables/class/1`, which is all the school holds. */
const JSS1: ClassTimetable = {
  class: { id: 1, name: 'JSS 1' },
  session: { id: 8, name: '2024/2025' },
  semester: { id: 1, name: 'First Term' },
  class_arm: 'JSS1 A',
  period_count: 2,
  message: null,
  days: [
    {
      day: 'Monday',
      periods: [
        {
          id: 15,
          subject_id: 7,
          title: null,
          label: 'IGBO LANGUAGE',
          subject_name: 'IGBO LANGUAGE',
          day_of_week: 'Monday',
          start_time: '11:58',
          end_time: '12:58',
          where: null,
          venue: null,
        },
        {
          id: 14,
          subject_id: 1,
          title: null,
          label: 'ENGLISH LANGUAGE',
          subject_name: 'ENGLISH LANGUAGE',
          day_of_week: 'Monday',
          start_time: '08:56',
          end_time: '10:56',
          where: null,
          venue: null,
        },
      ],
    },
    { day: 'Tuesday', periods: [] },
    { day: 'Wednesday', periods: [] },
    { day: 'Thursday', periods: [] },
    { day: 'Friday', periods: [] },
  ],
}

/** Pupil 4's own class, which has nothing entered — the ordinary case here. */
const EMPTY: ClassTimetable = {
  class: { id: 2, name: 'SSS I' },
  session: { id: 8, name: '2024/2025' },
  semester: { id: 1, name: 'First Term' },
  class_arm: 'JSS 2 A',
  period_count: 0,
  message: 'No timetable has been entered for this class yet.',
  days: [
    { day: 'Monday', periods: [] },
    { day: 'Tuesday', periods: [] },
    { day: 'Wednesday', periods: [] },
    { day: 'Thursday', periods: [] },
    { day: 'Friday', periods: [] },
  ],
}

/** `GET /students/me/courses` numbers its subjects the way a period does. */
const COURSES: MyCourses = {
  courses: [
    { id: 1, name: 'ENGLISH LANGUAGE', teachers: ['Mark Freeman', 'Diego Freeman'] },
    { id: 7, name: 'IGBO LANGUAGE', teachers: [] },
  ],
}

test('the week reads in the order it is taught, not the order it is sent', () => {
  // The endpoint returned 11:58 before 08:56 within Monday.
  assert.deepEqual(
    weekPeriods(JSS1).map((period) => period.start_time),
    ['08:56', '11:58'],
  )
})

test('a period names its teacher by joining the two answers on subject id', () => {
  const [english, igbo] = periodRows(JSS1, COURSES)
  assert.equal(english?.subject, 'ENGLISH LANGUAGE')
  assert.equal(english?.teacher, 'Mark Freeman, Diego Freeman')
  // A subject nobody is recorded as teaching says so rather than guessing.
  assert.equal(igbo?.teacher, '—')
})

test('a subject the pupil is not registered for still shows its period', () => {
  assert.equal(teacherFor({ id: 1, subject_id: 99 }, COURSES), '—')
  assert.equal(teacherFor({ id: 1, subject_id: null }, COURSES), '—')
})

test('both times are printed as the school sends them', () => {
  assert.equal(timeRange({ id: 1, start_time: '08:56', end_time: '10:56' }), '08:56 – 10:56')
  // Half a slot is still worth showing; neither is not.
  assert.equal(timeRange({ id: 1, start_time: '08:56', end_time: null }), '08:56')
  assert.equal(timeRange({ id: 1 }), '—')
})

test('a period with no subject falls back to the school’s own title', () => {
  assert.equal(labelOf({ id: 1, label: 'Break', title: 'Break' }), 'Break')
  assert.equal(labelOf({ id: 1, label: null, title: 'Assembly' }), 'Assembly')
  assert.equal(labelOf({ id: 1 }), '—')
})

test('every row carries the class, session and term for the panel behind it', () => {
  const [row] = periodRows(JSS1, COURSES)
  assert.equal(row?.klass, 'JSS 1 · JSS1 A')
  assert.equal(row?.session, '2024/2025')
  assert.equal(row?.term, 'First Term')
})

test('a class with nothing entered is no rows, not a row of dashes', () => {
  assert.deepEqual(periodRows(EMPTY, COURSES), [])
  assert.deepEqual(periodRows({}, COURSES), [])
  // The five days come back present and empty; none of them is a period.
  assert.equal(weekPeriods(EMPTY).length, 0)
})

test('the class reads the same pair as My subjects', () => {
  assert.equal(classOf(EMPTY), 'SSS I · JSS 2 A')
  // The class-scoped endpoint sends no arm, and that is not a missing value.
  assert.equal(classOf({ class: { id: 1, name: 'JSS 1' } }), 'JSS 1')
  assert.equal(classOf({}), '—')
})
