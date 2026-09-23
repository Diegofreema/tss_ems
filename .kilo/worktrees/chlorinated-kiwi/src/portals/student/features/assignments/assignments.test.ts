import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Assignment } from '../../../../api/assignments/types.ts'
import { questionCount, stateOf, assignmentRows, assignmentTally } from './assignments.ts'

/** Assignment 6 as `GET /assignments` actually sends it, once it had been sat. */
const ASSIGNMENT: Assignment = {
  id: 6,
  title: 'Simple additions',
  details: 'Please attempt all questions',
  test_type: 'cbt_test',
  status: 'active',
  subject_id: 2,
  subject: 'MATHEMATICS',
  department_id: 2,
  class: 'SSS I',
  opendate: '2026-08-27T10:03:00+01:00',
  closedate: '2026-08-28T10:08',
  time_limit: null,
  total_questions: 4,
  passing_score: 30,
  question_count: 1,
  my_status: 'submitted',
  submitted: true,
  window_problem: 'This test has closed.',
}

const NOW = new Date('2026-08-31T09:00:00').getTime()

test('an assignment that was sat reads as submitted, closed or not', () => {
  assert.equal(stateOf(ASSIGNMENT, NOW), 'Submitted')
})

test('open while the school sends no reason it cannot be sat', () => {
  assert.equal(
    stateOf({ ...ASSIGNMENT, submitted: false, window_problem: null }, NOW),
    'Open',
  )
})

test('shut and past its opening is missed; shut and still to come is not', () => {
  const shut = { ...ASSIGNMENT, submitted: false }
  assert.equal(stateOf(shut, NOW), 'Missed')
  assert.equal(
    stateOf({ ...shut, opendate: '2026-09-04T08:00:00+01:00' }, NOW),
    'Not open yet',
  )
})

test('a shut assignment with no opening date at all is over, not pending', () => {
  assert.equal(
    stateOf({ ...ASSIGNMENT, submitted: false, opendate: null }, NOW),
    'Missed',
  )
})

test('the questions column is what the teacher wrote, not what they promised', () => {
  // The assignment declares four and holds one.
  assert.equal(questionCount(ASSIGNMENT), 1)
  assert.equal(assignmentRows([ASSIGNMENT], NOW)[0].questions, '1')
})

test('a row carries the assignment as the list and the assignment page show it', () => {
  const [row] = assignmentRows([ASSIGNMENT], NOW)
  assert.equal(row.id, '6')
  assert.equal(row.title, 'Simple additions')
  assert.equal(row.subject, 'MATHEMATICS')
  assert.equal(row.klass, 'SSS I')
  assert.equal(row.minutes, 'No limit')
  assert.equal(row.pass, '30%')
  assert.equal(row.state, 'Submitted')
  // Word for word, so a student quoting it is quoting the school.
  assert.equal(row.why, 'This test has closed.')
})

test('the closing time is read on the school clock, not the reader\'s', () => {
  // `closedate` carries no zone; taken as UTC it would shut an hour early.
  assert.equal(assignmentRows([ASSIGNMENT], NOW)[0].closes, '28 Aug 2026, 10:08')
})

test('open assignments come first, then what is to come, then what is over', () => {
  const rows = assignmentRows(
    [
      { ...ASSIGNMENT, id: 1, submitted: true },
      { ...ASSIGNMENT, id: 2, submitted: false, window_problem: null },
      { ...ASSIGNMENT, id: 3, submitted: false, opendate: '2026-09-04T08:00:00+01:00' },
      { ...ASSIGNMENT, id: 4, submitted: false },
    ],
    NOW,
  )
  assert.deepEqual(
    rows.map((row) => row.state),
    ['Open', 'Not open yet', 'Missed', 'Submitted'],
  )
  // Within a state, newest first: 4 is missed and 1 submitted, both last.
  assert.deepEqual(rows.map((row) => row.id), ['2', '3', '4', '1'])
})

test('the tiles count the rows the list is showing', () => {
  const rows = assignmentRows(
    [
      { ...ASSIGNMENT, id: 1, submitted: false, window_problem: null },
      { ...ASSIGNMENT, id: 2 },
      { ...ASSIGNMENT, id: 3, submitted: false },
    ],
    NOW,
  )
  assert.deepEqual(assignmentTally(rows), { open: 1, submitted: 1, missed: 1 })
})

test('an assignment with nothing filled in is still nameable', () => {
  const [row] = assignmentRows([{ id: 9 }], NOW)
  assert.equal(row.title, 'Assignment 9')
  assert.equal(row.questions, '—')
  assert.equal(row.subject, '—')
  assert.equal(row.pass, '—')
})
