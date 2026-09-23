import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TeacherSubject } from '../../../../api/teachers/types.ts'
import type { ClassTimetable } from '../../../../api/timetables/types.ts'
import {
  type TimetableClass,
  classLabels,
  classWeeks,
  mySubjectIds,
  teachingSummary,
} from './class-weeks.ts'

/** `GET /timetables/classes` on bronze — two of these are both "SSS I". */
const CLASSES: TimetableClass[] = [
  { id: 1, name: 'JSS 1' },
  { id: 2, name: 'SSS I' },
  { id: 6, name: 'SSS I' },
]

/** Teacher 2's own subjects: English in JSS 1, Maths in SSS I. */
const SUBJECTS = [
  { id: 1, name: 'ENGLISH LANGUAGE', department_id: 1 },
  { id: 2, name: 'MATHEMATICS', department_id: 2 },
] as unknown as TeacherSubject[]

const week = (klass: string, periods: unknown[], message: string | null = null) =>
  ({
    class: { id: 1, name: klass },
    session: { id: 8, name: '2024/2025' },
    semester: { id: 1, name: 'First Term' },
    period_count: periods.length,
    message,
    days: [
      { day: 'Monday', periods },
      { day: 'Tuesday', periods: [] },
      { day: 'Wednesday', periods: [] },
      { day: 'Thursday', periods: [] },
      { day: 'Friday', periods: [] },
    ],
  }) as unknown as ClassTimetable

const JSS1 = week('JSS 1', [
  {
    id: 14,
    subject_id: 1,
    label: 'ENGLISH LANGUAGE',
    day_of_week: 'Monday',
    start_time: '08:56',
    end_time: '10:56',
  },
  {
    id: 15,
    subject_id: 7,
    label: 'IGBO LANGUAGE',
    day_of_week: 'Monday',
    start_time: '11:58',
    end_time: '12:58',
  },
])

const SSS1_TWO = week('SSS I', [
  {
    id: 20,
    subject_id: 9,
    label: 'CIVIC EDUCATION',
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '09:40',
  },
])

const NOTHING = week('SSS I', [], 'No timetable has been entered for this class yet.')

const WEDNESDAY = new Date(2026, 8, 2, 9, 0)

const build = (grids: ClassTimetable[]) =>
  classWeeks(
    CLASSES.map((klass, at) => ({ klass, grid: grids[at] })),
    mySubjectIds(SUBJECTS),
    WEDNESDAY,
  )

test('a repeated class name carries its id, and a unique one does not', () => {
  const labels = classLabels(CLASSES)
  assert.equal(labels.get(1), 'JSS 1')
  assert.equal(labels.get(2), 'SSS I · class 2')
  assert.equal(labels.get(6), 'SSS I · class 6')
})

test('a period is the teacher’s when its subject is', () => {
  const [jss1] = build([JSS1, SSS1_TWO, NOTHING])
  assert.equal(jss1.label, 'JSS 1')
  assert.deepEqual(
    jss1.columns[0].periods.map((period) => [period.subject, period.mine]),
    [
      ['ENGLISH LANGUAGE', true],
      ['IGBO LANGUAGE', false],
    ],
  )
  assert.equal(jss1.mine, 1)
  assert.equal(jss1.total, 2)
})

test('another teacher’s period says so rather than reading as missing data', () => {
  const [jss1] = build([JSS1, SSS1_TWO, NOTHING])
  const [own, other] = jss1.columns[0].periods
  assert.equal(own.teacher, '—')
  assert.equal(other.teacher, 'Not one of your subjects')
})

test('classes the teacher takes come first, then drawn weeks, then empty ones', () => {
  // JSS 1 holds one of theirs; class 2 holds a period that is not; class 6 has
  // no timetable at all.
  assert.deepEqual(
    build([JSS1, SSS1_TWO, NOTHING]).map((week) => week.label),
    ['JSS 1', 'SSS I · class 2', 'SSS I · class 6'],
  )
  // The server's order is kept inside a band, so a class only moves up when
  // there is something of the teacher's in it.
  assert.deepEqual(
    build([NOTHING, SSS1_TWO, JSS1]).map((week) => [week.label, week.mine]),
    [
      ['SSS I · class 6', 1],
      ['SSS I · class 2', 0],
      ['JSS 1', 0],
    ],
  )
})

test('an empty class is empty, and carries no sentence of the school’s own', () => {
  const [, , empty] = build([JSS1, SSS1_TWO, NOTHING])
  assert.equal(empty.total, 0)
  assert.equal('message' in empty, false)
})

test('the summary counts periods and the classes they are spread over', () => {
  assert.equal(
    teachingSummary(build([JSS1, SSS1_TWO, NOTHING])),
    '1 period a week, across 1 class.',
  )
  assert.equal(
    teachingSummary(build([JSS1, JSS1, NOTHING])),
    '2 periods a week, across 2 classes.',
  )
  assert.equal(
    teachingSummary(build([SSS1_TWO, SSS1_TWO, NOTHING])),
    'None of the periods entered so far are in your subjects.',
  )
})
