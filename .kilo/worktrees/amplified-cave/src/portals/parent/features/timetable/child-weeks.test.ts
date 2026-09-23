import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ChildTimetable } from '../../../../api/timetables/types.ts'
import { childWeeks, classLine, tabLabels } from './child-weeks.ts'

/**
 * `GET /timetables/children` as a guardian on bronze answered it — six
 * children, three of them called "Diego Freeman", two of those in the same
 * class and the same arm.
 */
const JSS1_DAYS = [
  {
    day: 'Monday',
    periods: [
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
    ],
  },
  { day: 'Tuesday', periods: [] },
  { day: 'Wednesday', periods: [] },
  { day: 'Thursday', periods: [] },
  { day: 'Friday', periods: [] },
]

const EMPTY_DAYS = [
  { day: 'Monday', periods: [] },
  { day: 'Tuesday', periods: [] },
  { day: 'Wednesday', periods: [] },
  { day: 'Thursday', periods: [] },
  { day: 'Friday', periods: [] },
]

const entry = (over: Partial<ChildTimetable>): ChildTimetable =>
  ({
    student_id: 24,
    name: 'Diego Freeman',
    class_id: 1,
    class_name: 'JSS 1',
    class_arm: 'B',
    message: null,
    timetable: {
      class: { id: 1, name: 'JSS 1' },
      session: { id: 8, name: '2024/2025' },
      semester: { id: 1, name: 'First Term' },
      days: JSS1_DAYS,
      period_count: 2,
      message: null,
    },
    ...over,
  }) as unknown as ChildTimetable

const UNDRAWN = entry({
  student_id: 25,
  class_id: 5,
  class_name: 'JSS III',
  class_arm: 'JSS III A',
  timetable: {
    class: { id: 5, name: 'JSS III' },
    days: EMPTY_DAYS,
    period_count: 0,
    message: 'No timetable has been entered for this class yet.',
  },
} as unknown as Partial<ChildTimetable>)

const WEDNESDAY = new Date(2026, 8, 2, 9, 0)

test('a child’s week is drawn from the grid sent beside them', () => {
  const [week] = childWeeks([entry({})], WEDNESDAY)
  assert.equal(week.id, '24')
  assert.equal(week.name, 'Diego Freeman')
  assert.equal(week.klass, 'JSS 1 · B')
  assert.equal(week.total, 2)
  assert.deepEqual(
    week.columns[0].periods.map((period) => period.subject),
    ['ENGLISH LANGUAGE', 'IGBO LANGUAGE'],
  )
  // Nothing is marked as anyone's: every period in the class is the child's.
  assert.deepEqual(
    week.columns[0].periods.map((period) => period.mine),
    [undefined, undefined],
  )
})

test('two children of the same name in the same arm are told apart by id', () => {
  const weeks = childWeeks(
    [entry({ student_id: 24 }), entry({ student_id: 27 }), UNDRAWN],
    WEDNESDAY,
  )
  assert.deepEqual(
    weeks.map((week) => week.name),
    ['Diego Freeman · student 24', 'Diego Freeman · student 27', 'Diego Freeman'],
  )
})

test('the class line shows the arm, and says neither twice', () => {
  assert.equal(classLine(entry({})), 'JSS 1 · B')
  assert.equal(classLine(entry({ class_arm: 'JSS 1' })), 'JSS 1')
  assert.equal(classLine(entry({ class_name: null, class_arm: null })), 'No class yet')
})

test('an undrawn class carries no message, so the page writes its own', () => {
  const [week] = childWeeks([UNDRAWN], WEDNESDAY)
  assert.equal(week.total, 0)
  assert.equal(week.message, null)
})

test('a child with no timetable at all is still on the page, saying why', () => {
  const [week] = childWeeks(
    [entry({ student_id: 30, class_name: null, class_arm: null, timetable: null })],
    WEDNESDAY,
  )
  assert.equal(week.klass, 'No class yet')
  assert.equal(week.columns.length, 0)
  assert.match(week.message ?? '', /has not placed this child in a class/)
})

test('the API’s own sentence is dropped, whichever field carries it', () => {
  // It explains the school's session and term settings, which no guardian can
  // change — the page says "no timetable yet" rather than passing it on.
  const [week] = childWeeks(
    [entry({ student_id: 31, message: 'This class has 2 period(s) on file, but under First Term 2024/2025.' })],
    WEDNESDAY,
  )
  assert.equal(week.message, null)
})

test('a tab says only as much as the household forces it to', () => {
  const ada = entry({ student_id: 40, name: 'Ada Nwosu' })
  const chidi = entry({ student_id: 41, name: 'Chidi Nwosu' })
  // Different first names: the first name is the whole tab.
  assert.deepEqual([...tabLabels([ada, chidi]).values()], ['Ada', 'Chidi'])

  // Same first name: the tabs fall back to the whole name, together.
  const adaeze = entry({ student_id: 42, name: 'Ada Okoro' })
  assert.deepEqual(
    [...tabLabels([ada, adaeze]).values()],
    ['Ada Nwosu', 'Ada Okoro'],
  )

  // The bronze household: same name, same class, same arm. Nothing shorter
  // than the student id tells 24 and 27 apart.
  assert.deepEqual(
    [...tabLabels([entry({ student_id: 24 }), entry({ student_id: 27 }), UNDRAWN]).values()],
    [
      'Diego Freeman · student 24',
      'Diego Freeman · student 27',
      'Diego Freeman · student 25',
    ],
  )
})

test('the class tells two of the same name apart before the id does', () => {
  const here = entry({ student_id: 50 })
  const there = entry({ student_id: 51, class_name: 'JSS III', class_arm: 'A' })
  assert.deepEqual(
    [...tabLabels([here, there]).values()],
    ['Diego Freeman · JSS 1 · B', 'Diego Freeman · JSS III · A'],
  )
})
