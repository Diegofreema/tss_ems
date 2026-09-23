import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TeacherSubject } from '../../../../api/teachers/types.ts'
import type { ClassTimetable } from '../../../../api/timetables/types.ts'
import {
  type TimetableClass,
  classLabels,
  classWeeks,
  mySubjectIds,
  noPeriodsYet,
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

/**
 * What `classTimetableQuery` substitutes when a class's week could not be
 * read — no `days` at all, where the API sends the five school days on every
 * real answer, empty or not. That is the only thing telling a refusal apart
 * from a week the office has not drawn.
 */
const REFUSED = {
  days: [],
  period_count: 0,
  message: 'You do not have permission to view this class.',
} as unknown as ClassTimetable

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

test('a class the teacher has no period in is not on the page', () => {
  // JSS 1 holds one of theirs; class 2 holds a period that is not; class 6 has
  // no timetable at all. Only the first survives.
  assert.deepEqual(
    build([JSS1, SSS1_TWO, NOTHING]).map((week) => week.label),
    ['JSS 1'],
  )
})

test('a week nobody could read is kept, with the reason and below their own', () => {
  const weeks = build([JSS1, REFUSED, REFUSED])
  assert.deepEqual(
    weeks.map((week) => [week.label, week.unreadable]),
    [
      ['JSS 1', false],
      ['SSS I · class 2', true],
      ['SSS I · class 6', true],
    ],
  )
  assert.equal(weeks[1].note, 'You do not have permission to view this class.')
})

test('an unreadable week is not a class they teach in', () => {
  // It is shown, but it is not evidence of a period — the summary counts the
  // classes that hold one.
  assert.equal(
    teachingSummary(build([JSS1, REFUSED, REFUSED])),
    '1 period a week, across 1 class.',
  )
})

test('a week the office simply has not drawn is dropped, not kept', () => {
  // `NOTHING` carries the five days and the school's own sentence: read in
  // full, and holding nothing. Only a grid with no days at all is a refusal.
  assert.deepEqual(build([JSS1, NOTHING, NOTHING]).map((week) => week.label), ['JSS 1'])
})

test('a class with a timetable but nothing of theirs is dropped too', () => {
  // The case that reads worst on the page: a full week drawn, every period
  // somebody else's. It used to sit under their own classes saying "none
  // yours".
  assert.deepEqual(build([SSS1_TWO, SSS1_TWO, SSS1_TWO]), [])
})

test('what is left keeps the order the school sent its classes in', () => {
  assert.deepEqual(
    build([JSS1, JSS1, JSS1]).map((week) => week.label),
    ['JSS 1', 'SSS I · class 2', 'SSS I · class 6'],
  )
})

test('every class is still read, so a period of theirs anywhere is found', () => {
  // The teacher's own subject sits in the last class the server sent. Nothing
  // narrows the fetch, so it is drawn like any other.
  assert.deepEqual(
    build([NOTHING, SSS1_TWO, JSS1]).map((week) => [week.label, week.mine]),
    [['SSS I · class 6', 1]],
  )
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
  // Nothing of theirs anywhere: the page draws its empty state rather than
  // this line, but the sentence is kept for the one caller that would.
  assert.equal(
    teachingSummary(build([SSS1_TWO, SSS1_TWO, NOTHING])),
    'None of the periods entered so far are in your subjects.',
  )
})

/**
 * Teacher 135 on bronze, read 2026-09-16: Agriculture and Home Economics, both
 * in SSS 3. The two periods the school holds in the current term are Igbo
 * Language (JSS 1) and Physical and Health Education (SSS 3) — so this
 * teacher's page is empty while the school's timetable is not, which is the
 * case the sentence exists for.
 */
const OBINNA = [
  { id: 131, name: 'AGRICULTURE', department_id: 83 },
  { id: 134, name: 'HOME ECONOMICS', department_id: 83 },
] as unknown as TeacherSubject[]

test('an empty week names the subjects it found no period for', () => {
  assert.equal(
    noPeriodsYet(OBINNA),
    'Every class open to you was read, and none of the periods drawn in them is in AGRICULTURE and HOME ECONOMICS. A class appears here as soon as the office draws a period for one of your subjects.',
  )
})

test('one subject reads as one, and three are listed with commas', () => {
  assert.match(noPeriodsYet(OBINNA.slice(0, 1)), /is in AGRICULTURE\. A class/)
  assert.match(
    noPeriodsYet([...OBINNA, { id: 7, name: 'IGBO LANGUAGE' }] as unknown as TeacherSubject[]),
    /is in AGRICULTURE, HOME ECONOMICS and IGBO LANGUAGE\./,
  )
})

test('a teacher holding no subject at all is told that instead', () => {
  // Nothing to have a period in, so naming an empty list would read as a bug.
  assert.equal(
    noPeriodsYet([]),
    'The office has not put any subject in your hands yet, so no period can be yours. They appear on My subjects once it has.',
  )
})
