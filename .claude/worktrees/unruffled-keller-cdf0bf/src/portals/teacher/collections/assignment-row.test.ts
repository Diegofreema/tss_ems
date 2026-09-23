import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Assignment } from '../../../api/set-assignments/types.ts'
import { assignmentRows, assignmentTally, stateOf } from './assignment-row.ts'

/** Assignment 35 as `GET /setassignments` sends it, before a question was written. */
const ASSIGNMENT: Assignment = {
  id: 35,
  title: 'Mid-term test',
  details: 'Answer all questions.',
  test_type: 'cbt_test',
  subject_id: 2,
  subject: 'MATHEMATICS',
  department_id: 6,
  class: 'SSS I',
  semester_id: 1,
  semester: 'First Term',
  teacher_id: 7,
  status: 'active',
  opendate: null,
  closedate: '2026-09-09 14:57:53',
  time_limit: 30,
  passing_score: 50,
  total_questions: 0,
}

const NOW = new Date('2026-09-02T09:00:00').getTime()

test('an assignment holding no questions is the outstanding job, not an open assignment', () => {
  assert.equal(stateOf(ASSIGNMENT, NOW), 'No questions')
  assert.equal(stateOf({ ...ASSIGNMENT, total_questions: 1 }, NOW), 'Open')
})

test('an assignment whose window has gone is closed, written or not', () => {
  const shut = { ...ASSIGNMENT, closedate: '2026-08-30 14:57:53' }
  assert.equal(stateOf(shut, NOW), 'Closed')
  assert.equal(stateOf({ ...shut, total_questions: 4 }, NOW), 'Closed')
})

test('a written assignment that opens later is still to come', () => {
  assert.equal(
    stateOf(
      { ...ASSIGNMENT, total_questions: 4, opendate: '2026-09-05T08:00:00+01:00' },
      NOW,
    ),
    'Not open yet',
  )
})

test('an assignment the school has taken out of use says so first', () => {
  assert.equal(stateOf({ ...ASSIGNMENT, status: 'inactive' }, NOW), 'Inactive')
})

test('the closing time is read on the school clock, not the reader\'s', () => {
  // `closedate` carries no zone and a space rather than a T; taken as UTC it
  // would shut the assignment an hour early.
  assert.equal(assignmentRows([ASSIGNMENT], NOW)[0].closes, '09 Sept 2026, 14:57')
})

test('a row carries the register\'s columns and the ids its form submits', () => {
  const [row] = assignmentRows([ASSIGNMENT], NOW)
  assert.equal(row.id, '35')
  assert.equal(row.title, 'Mid-term test')
  assert.equal(row.subject, 'MATHEMATICS')
  assert.equal(row.klass, 'SSS I')
  assert.equal(row.questions, '0')
  assert.equal(row.minutes, '30 minutes')
  assert.equal(row.pass, '50%')
  assert.equal(row.state, 'No questions')
  assert.equal(row.subject_id, '2')
  assert.equal(row.department_id, '6')
})

test('unwritten assignments come first, then live, then what is over', () => {
  const rows = assignmentRows(
    [
      { ...ASSIGNMENT, id: 1, total_questions: 3 },
      { ...ASSIGNMENT, id: 2 },
      { ...ASSIGNMENT, id: 3, total_questions: 3, closedate: '2026-08-30 14:57:53' },
      { ...ASSIGNMENT, id: 4, total_questions: 3, opendate: '2026-09-05T08:00:00+01:00' },
    ],
    NOW,
  )
  assert.deepEqual(
    rows.map((row) => row.state),
    ['No questions', 'Open', 'Not open yet', 'Closed'],
  )
  assert.deepEqual(rows.map((row) => row.id), ['2', '1', '4', '3'])
})

test('the tiles count the rows the register is showing', () => {
  const rows = assignmentRows(
    [
      { ...ASSIGNMENT, id: 1, total_questions: 3 },
      { ...ASSIGNMENT, id: 2 },
      { ...ASSIGNMENT, id: 3, total_questions: 3, closedate: '2026-08-30 14:57:53' },
    ],
    NOW,
  )
  assert.deepEqual(assignmentTally(rows), { assignments: 3, open: 1, unwritten: 1 })
})

test('an assignment with nothing filled in is still nameable', () => {
  const [row] = assignmentRows([{ id: 9 }], NOW)
  assert.equal(row.title, 'Assignment 9')
  assert.equal(row.subject, '—')
  assert.equal(row.minutes, 'No limit')
  assert.equal(row.pass, '—')
  // No closing date is not a closed assignment.
  assert.equal(row.state, 'No questions')
})
