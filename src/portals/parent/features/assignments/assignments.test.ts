import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ChildAssignment, ChildAssignments } from '../../../../api/parents/types.ts'
import { assignmentRow, assignmentState, childAssignments } from './assignments.ts'

/** The assignment as `sparents/my-assignments` sends it. */
const ASSIGNMENT: ChildAssignment = {
  setassignment_id: 5,
  title: 'new assignment reading',
  subject: 'ENGLISH LANGUAGE',
  time_limit: null,
  opendate: '2026-08-27T09:52:00+00:00',
  closedate: '2026-08-29T09:52',
  status: 'available',
  assignment_id: null,
}

const OPEN_DAY = new Date('2026-08-28T08:00:00')
const AFTER_CLOSING = new Date('2026-08-30T08:00:00')

test('an assignment still open reads as available', () => {
  assert.equal(assignmentState(ASSIGNMENT, OPEN_DAY), 'Available')
})

test('an assignment the API still calls available reads as closed once it has', () => {
  // The endpoint does not re-check the clock when it answers: this assignment shut
  // on the 29th and is asked for on the 30th.
  assert.equal(assignmentState(ASSIGNMENT, AFTER_CLOSING), 'Closed')
})

test('the state the child reached is the API own word, whatever it is', () => {
  const sat = { ...ASSIGNMENT, status: 'completed', assignment_id: 17 }
  // Past its closing time, and still completed — sitting it is the later fact.
  assert.equal(assignmentState(sat, AFTER_CLOSING), 'Completed')
  assert.equal(assignmentState({ ...ASSIGNMENT, status: 'graded' }, OPEN_DAY), 'Graded')
  assert.equal(assignmentState({ ...ASSIGNMENT, status: '' }, OPEN_DAY), '—')
})

test('an assignment with no closing time stays open rather than reading closed', () => {
  assert.equal(assignmentState({ ...ASSIGNMENT, closedate: null }, AFTER_CLOSING), 'Available')
})

test('a row is named by the assignment, so an unsat one still has an id', () => {
  const row = assignmentRow(ASSIGNMENT, OPEN_DAY)
  assert.equal(row.id, '5')
  assert.equal(row.title, 'new assignment reading')
  assert.equal(row.subject, 'ENGLISH LANGUAGE')
  assert.equal(row.limit, 'No limit')
  assert.equal(assignmentRow({ ...ASSIGNMENT, time_limit: 45 }, OPEN_DAY).limit, '45 minutes')
})

test('both stamps read on the school clock, whatever offset they carry', () => {
  const row = assignmentRow(ASSIGNMENT, OPEN_DAY)
  // `opendate` says +00:00 and `closedate` says nothing at all; both are 09:52
  // where the school is, and neither is shifted an hour.
  assert.match(row.opens, /27 Aug 2026, 09:52/)
  assert.match(row.closes, /29 Aug 2026, 09:52/)
})

test('the register picks its own child out of the household', () => {
  const household = [
    { student: { id: 7 }, assignments: [ASSIGNMENT] },
    { student: { id: 8 }, assignments: [{ ...ASSIGNMENT, status: 'completed', assignment_id: 17 }] },
  ] as ChildAssignments[]

  assert.deepEqual(
    childAssignments(household, 8, OPEN_DAY).map((row) => row.state),
    ['Completed'],
  )
  // A child whose class has nothing set is not an error.
  assert.deepEqual(childAssignments(household, 16, OPEN_DAY), [])
})
