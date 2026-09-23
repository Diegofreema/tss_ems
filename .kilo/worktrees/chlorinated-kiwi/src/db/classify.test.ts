import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApiError } from '../api/client.ts'
import { backoffFor, classify } from './classify.ts'
import { OfflineError } from './errors.ts'

test('a connection that was never there is worth trying again', () => {
  assert.equal(classify(new OfflineError('parent.children')), 'retryable')
  assert.equal(classify(new TypeError('Failed to fetch')), 'retryable')
})

test('a refused token stops the queue rather than failing the work in it', () => {
  assert.equal(classify(new ApiError(401, 'Authentication required. Send a valid bearer token.')), 'auth')
})

test('a 403 is this row refused, not this session refused', () => {
  // The API answers 401 for a token it will not take and keeps 403 for what
  // this account may not do to this particular row. Reading 403 as an auth
  // failure paused the whole drain for the rest of the session over one write
  // the school was never going to accept, with the banner still calling it
  // "still being sent" and "Send now" returning at the pause without asking.
  assert.equal(
    classify(new ApiError(403, 'You cannot start a conversation with that person.')),
    'terminal',
  )
  assert.equal(classify(new ApiError(403, 'This class is not yours to mark.')), 'terminal')
})

test('the school being unwell is temporary; the school saying no is not', () => {
  for (const status of [408, 425, 429, 500, 502, 503, 504]) {
    assert.equal(classify(new ApiError(status, 'later')), 'retryable', `${status} should be retryable`)
  }
  for (const status of [400, 404, 409, 422]) {
    assert.equal(classify(new ApiError(status, 'no')), 'terminal', `${status} should be terminal`)
  }
})

test('a failure with no story to tell is not replayed forever', () => {
  assert.equal(classify(new Error('something')), 'terminal')
  assert.equal(classify('a string'), 'terminal')
  assert.equal(classify(undefined), 'terminal')
})

test('backoff climbs and then holds, so a device in a corridor keeps asking', () => {
  assert.equal(backoffFor(0), 1_000)
  assert.equal(backoffFor(1), 4_000)
  assert.equal(backoffFor(4), 300_000)
  assert.equal(backoffFor(40), 300_000)
  // A negative count is nonsense, but it must not read as "wait forever".
  assert.equal(backoffFor(-1), 1_000)
})

test('a request the client gave up on is a dropped connection, not a refusal', () => {
  // `request()` bounds every send; a socket that stopped answering rejects
  // with a TimeoutError, and the school may or may not have heard — exactly
  // the ambiguity of a link dying mid-flight, so it is retried the same way.
  assert.equal(classify(new DOMException('took too long', 'TimeoutError')), 'retryable')
  assert.equal(classify(new DOMException('torn down', 'AbortError')), 'retryable')
})
