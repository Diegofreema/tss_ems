import assert from 'node:assert/strict'
import { test } from 'node:test'
import { topicBody, topicUpdate, uploadTerm } from './teaching-body.ts'

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

/** What this teacher's marks imply, where they have any. */
const INFERRED = { session_id: 7, semester_id: 3, label: 'Third Term · 2023/2024' }

test('an upload files into the term the teacher picked', () => {
  assert.deepEqual(uploadTerm({ session_id: '8', semester_id: '1' }, INFERRED), {
    session_id: 8,
    semester_id: 1,
    label: 'Term 1 · session 8',
  })
})

test('picking neither leaves the batch where the marks already are', () => {
  // The behaviour the form had before the pickers existed, and the one that
  // keeps working while a teaching login may not read the calendar.
  assert.deepEqual(uploadTerm({}, INFERRED), INFERRED)
  assert.equal(uploadTerm({ session_id: '', semester_id: '' }, INFERRED), INFERRED)
})

test('half a choice is refused rather than half-honoured', () => {
  // A session picked with no term is not a term. Filing into the inferred one
  // would put the batch somewhere other than where the teacher was aiming,
  // and a batch is a whole arm's marks.
  assert.throws(() => uploadTerm({ session_id: '8' }, INFERRED), /both the session and the term/)
  assert.throws(() => uploadTerm({ semester_id: '1' }, INFERRED), /both the session and the term/)
})

test('a teacher with no marks and no choice has no term to file into', () => {
  // The caller then asks the school's own register, and says so if that is
  // empty too — see `uploadBody`.
  assert.equal(uploadTerm({}, undefined), undefined)
})
