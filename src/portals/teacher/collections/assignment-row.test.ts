import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Assignment } from '../../../api/set-assignments/types.ts'
import {
  assignmentRows,
  assignmentTally,
  editableFields,
  stateOf,
} from './assignment-row.ts'

/** A paper as `GET /setassignments` sends it since 2026-10-02 — no quiz fields left on it. */
const ASSIGNMENT: Assignment = {
  id: 35,
  title: 'Mid-term test',
  details: 'Answer all questions.',
  subject_id: 2,
  subject: 'MATHEMATICS',
  department_id: 6,
  class: 'SSS I',
  class_arm_id: null,
  for_every_arm: true,
  semester_id: 1,
  semester: 'First Term',
  teacher_id: 7,
  status: 'active',
  opendate: null,
  closedate: '2026-09-09 14:57:53',
  submission_count: 0,
}

const NOW = new Date('2026-09-02T09:00:00').getTime()

test('an assignment inside its window is open — its instructions are the task', () => {
  assert.equal(stateOf(ASSIGNMENT, NOW), 'Open')
})

test('an assignment whose window has gone is closed', () => {
  assert.equal(stateOf({ ...ASSIGNMENT, closedate: '2026-08-30 14:57:53' }, NOW), 'Closed')
})

test('an assignment that opens later is still to come', () => {
  assert.equal(
    stateOf({ ...ASSIGNMENT, opendate: '2026-09-05T08:00:00+01:00' }, NOW),
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
  assert.equal(row.arms, 'Every arm')
  assert.equal(row.state, 'Open')
  assert.equal(row.subject_id, '2')
  assert.equal(row.department_id, '6')
  assert.equal(row.class_arm_id, '')
  // Gone from the school's answer, so gone from the row.
  for (const gone of ['questions', 'minutes', 'pass', 'time_limit', 'passing_score']) {
    assert.equal(gone in row, false, gone)
  }
})

test('a paper for one arm says so, and carries the arm for the form', () => {
  const [row] = assignmentRows(
    [{ ...ASSIGNMENT, class_arm_id: 47, for_every_arm: false }],
    NOW,
  )
  assert.equal(row.arms, 'One arm')
  assert.equal(row.class_arm_id, '47')
})

test('live assignments come first, then what is coming, then what is over', () => {
  const rows = assignmentRows(
    [
      { ...ASSIGNMENT, id: 1 },
      { ...ASSIGNMENT, id: 3, closedate: '2026-08-30 14:57:53' },
      { ...ASSIGNMENT, id: 4, opendate: '2026-09-05T08:00:00+01:00' },
      { ...ASSIGNMENT, id: 5, status: 'inactive' },
    ],
    NOW,
  )
  assert.deepEqual(
    rows.map((row) => row.state),
    ['Open', 'Not open yet', 'Closed', 'Inactive'],
  )
  assert.deepEqual(rows.map((row) => row.id), ['1', '4', '3', '5'])
})

test('the tiles count the rows the register is showing, and what has come back', () => {
  const rows = assignmentRows(
    [
      { ...ASSIGNMENT, id: 1, submission_count: 4 },
      { ...ASSIGNMENT, id: 2, submission_count: 2 },
      { ...ASSIGNMENT, id: 3, closedate: '2026-08-30 14:57:53' },
    ],
    NOW,
  )
  assert.deepEqual(assignmentTally(rows), { assignments: 3, open: 2, handedIn: 6 })
})

test('an assignment with nothing filled in is still nameable', () => {
  const [row] = assignmentRows([{ id: 9 }], NOW)
  assert.equal(row.title, 'Assignment 9')
  assert.equal(row.subject, '—')
  assert.equal(row.arms, 'Every arm')
  // No closing date is not a closed assignment.
  assert.equal(row.state, 'Open')
})

/*
 * `locked`, `locked_reason` and `editable_when_locked` were read off bronze
 * on 2026-09-16: four of five papers came back locked, each because a pupil
 * had already handed it in.
 */
const LOCKED: Assignment = {
  id: 89,
  title: 'Weekend Quiz Home Economics',
  status: 'active',
  opendate: null,
  closedate: '2026-09-22 18:56:44',
  submission_count: 1,
  locked: true,
  locked_reason:
    '1 pupil has already handed this paper in, so it can no longer be changed.',
  editable_when_locked: ['status', 'closedate'],
}

test('a locked paper names the fields the school will still take', () => {
  assert.deepEqual(editableFields(LOCKED), ['status', 'closedate'])
})

test('a paper nobody has sat is open to everything', () => {
  assert.equal(editableFields({ ...LOCKED, locked: false }), null)
  assert.equal(editableFields({ ...LOCKED, locked: null }), null)
})

test('a deployment that locks without saying what it allows locks nothing', () => {
  // A form must never be shut on a question the school was never asked: with
  // no list, the whole body goes and the school decides, which is what
  // happened before any of these fields existed.
  assert.equal(editableFields({ ...LOCKED, editable_when_locked: undefined }), null)
})

test('the row carries the window as the form reads it and as the reader does', () => {
  const [row] = assignmentRows([LOCKED], Date.parse('2026-09-20T09:00:00'))
  // The display string is for reading and parses to nothing; the `_at` value
  // is what the control opens on.
  assert.equal(row.closes_at, '2026-09-22T18:56')
  assert.equal(row.opens_at, '')
  assert.equal(row.sat_by, '1')
  assert.equal(row.editable_when_locked, 'status,closedate')
})
