import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alreadySat, alreadySatNote } from './resubmit.ts'

/** What `request()` throws: an Error carrying the school's status and sentence. */
const apiError = (status: number, message: string) =>
  Object.assign(new Error(message), { name: 'ApiError', status })

test('the school’s 409 is recognised as "you have already sat this"', () => {
  assert.equal(alreadySat(apiError(409, 'You have already submitted this test.')), true)
})

test('any other refusal is not this one', () => {
  // A closed window, a lost connection and a server fault are all different
  // news, and telling a student their work is already in would be wrong.
  assert.equal(alreadySat(apiError(403, 'This test has closed.')), false)
  assert.equal(alreadySat(apiError(500, 'Server error')), false)
  assert.equal(alreadySat(new Error('Failed to fetch')), false)
  assert.equal(alreadySat(null), false)
  assert.equal(alreadySat(undefined), false)
  assert.equal(alreadySat('409'), false)
})

test('the school speaks first, and we answer what the student will ask', () => {
  const note = alreadySatNote(apiError(409, 'You have already submitted this test.'))
  assert.match(note, /^You have already submitted this test\./)
  assert.match(note, /nothing you have typed just now replaces it/)
})

test('a refusal with no sentence on it still explains itself', () => {
  const note = alreadySatNote(apiError(409, ''))
  assert.match(note, /can be taken once/)
  assert.doesNotMatch(note, /^\s/)
})
