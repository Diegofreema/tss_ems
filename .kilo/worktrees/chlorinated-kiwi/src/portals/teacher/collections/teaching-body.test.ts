import assert from 'node:assert/strict'
import { test } from 'node:test'
import { topicBody, topicUpdate } from './teaching-body.ts'

const VALUES = {
  subject_id: '2',
  title: '  Quadratic equations  ',
  contents: 'Factorisation, then two past questions.',
}

test('a new topic carries the subject it was filed under', () => {
  assert.deepEqual(topicBody(VALUES), {
    subject_id: 2,
    title: 'Quadratic equations',
    contents: 'Factorisation, then two past questions.',
  })
})

test('an edit sends what the endpoint takes and leaves the subject alone', () => {
  assert.deepEqual(topicUpdate(VALUES), {
    title: 'Quadratic equations',
    contents: 'Factorisation, then two past questions.',
  })
})

test('a subject nobody chose is not sent as a subject', () => {
  assert.equal(topicBody({ ...VALUES, subject_id: '' }).subject_id, 0)
})
