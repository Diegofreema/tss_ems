import assert from 'node:assert/strict'
import { test } from 'node:test'
import { armBody, subjectBody } from './academics-body.ts'

test('an unassigned form teacher is sent, so the arm can be cleared', () => {
  // Left out entirely, the endpoint would keep whoever is already on the arm.
  assert.equal(armBody({ arm_name: 'JSS1 A' }).class_teacher_id, '')
  assert.equal(armBody({ arm_name: 'JSS1 A', class_teacher_id: '14' }).class_teacher_id, 14)
})

test('only the three statuses the API knows are sent', () => {
  assert.equal(armBody({ arm_name: 'A', armstatus: 'Archived' }).status, 'archived')
  assert.equal(armBody({ arm_name: 'A', armstatus: 'Retired' }).status, undefined)
  assert.equal(armBody({ arm_name: 'A' }).status, undefined)
})

test('an empty description is dropped rather than blanking the arm', () => {
  assert.equal(armBody({ arm_name: 'A', arm_description: '   ' }).arm_description, undefined)
})

test('the code and the credit load are the API\u2019s to fill, so neither is sent', () => {
  const body = subjectBody({ name: 'Mathematics', subjectcode: 'MTH', creditload: '3' })
  assert.equal('subjectcode' in body, false)
  assert.equal('creditload' in body, false)
})

test('the body is the shape the endpoint asked for', () => {
  assert.deepEqual(
    subjectBody({ name: 'INTEGRATED SCIENCE', department_id: '1', teacher_ids: ['2'] }),
    { name: 'INTEGRATED SCIENCE', department_id: 1, teachers: [2] },
  )
})

test('the teachers go as numbers, and rubbish in the array is dropped', () => {
  const body = subjectBody({ name: 'X', teacher_ids: ['2', '13', '', 'x', '0'] })
  assert.deepEqual(body.teachers, [2, 13])
})

test('an empty set of teachers is sent, not left out', () => {
  // The key replaces the whole set, so leaving it out of an edit that unticked
  // the last teacher would leave them carrying the subject.
  assert.deepEqual(subjectBody({ name: 'X' }).teachers, [])
})
