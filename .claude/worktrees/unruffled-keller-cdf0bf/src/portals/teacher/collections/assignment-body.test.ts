import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assignmentBody } from './assignment-body.ts'

const FILLED = {
  subject_id: '2',
  department_id: '6',
  title: '  Mid-term test  ',
  details: 'Answer all questions.',
  time_limit: '30',
  passing_score: '50',
}

test('the form submits ids and figures, not the text it was typed as', () => {
  assert.deepEqual(assignmentBody(FILLED), {
    subject_id: 2,
    department_id: 6,
    title: 'Mid-term test',
    details: 'Answer all questions.',
    test_type: 'cbt_test',
    time_limit: 30,
    passing_score: 50,
  })
})

test('a blank limit is no limit, which is the API\'s own null', () => {
  const body = assignmentBody({ ...FILLED, time_limit: '', passing_score: undefined })
  assert.equal(body.time_limit, null)
  assert.equal(body.passing_score, null)
})

test('the design lets a figure be typed with separators', () => {
  assert.equal(assignmentBody({ ...FILLED, time_limit: '1,20' }).time_limit, 120)
})

test('status is sent only when it is being carried through an edit', () => {
  assert.equal('status' in assignmentBody(FILLED), false)
  assert.equal(assignmentBody(FILLED, 'active').status, 'active')
})
