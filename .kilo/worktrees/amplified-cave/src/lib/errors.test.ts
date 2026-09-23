import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApiError } from '../api/client.ts'
import { errorMessage, OFFLINE_MESSAGE } from './errors.ts'

const FALLBACK = OFFLINE_MESSAGE

test("the school's own sentence is always what is shown", () => {
  assert.equal(
    errorMessage(new ApiError(403, 'You cannot start a conversation with that person.'), FALLBACK),
    'You cannot start a conversation with that person.',
  )
})

test('a refusal with nothing to say still gets the fallback', () => {
  assert.equal(errorMessage(new ApiError(500, ''), FALLBACK), FALLBACK)
})

/**
 * The bug this was written for: the results upload throws a plain `Error`
 * saying which field is missing, and it was being shown as a network failure —
 * so a teacher who had not picked an arm was told to check their connection.
 */
test('a message this app raised itself is shown, not swallowed', () => {
  assert.equal(
    errorMessage(new Error('Choose one of the arms you take.'), FALLBACK),
    'Choose one of the arms you take.',
  )
})

test('a dead connection is the fallback, never the browser’s own words', () => {
  // What `fetch` rejects with when the request never left.
  assert.equal(errorMessage(new TypeError('Failed to fetch'), FALLBACK), FALLBACK)
})

test('an aborted request is the fallback too', () => {
  const aborted = new DOMException('signal is aborted without reason', 'AbortError')
  assert.equal(errorMessage(aborted, FALLBACK), FALLBACK)
})

test('anything that is not an error at all falls back', () => {
  assert.equal(errorMessage(undefined, FALLBACK), FALLBACK)
  assert.equal(errorMessage('a string', FALLBACK), FALLBACK)
  assert.equal(errorMessage({ message: 'not an Error' }, FALLBACK), FALLBACK)
  assert.equal(errorMessage(new Error(''), FALLBACK), FALLBACK)
})
