import assert from 'node:assert/strict'
import { test } from 'node:test'

/** Node has no storage of its own; the module reads this one lazily. */
function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size
    },
  } as Storage
}

const local = fakeStorage()
Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true })

const {
  attemptExpiry,
  attemptKey,
  clearAttempt,
  parseAttempt,
  readAttempt,
  writeAttempt,
} = await import('./attempt.ts')

const minute = 60 * 1000
const started = Date.parse('2026-09-03T10:00:00')

const attempt = {
  assignmentId: '6',
  startedAt: started,
  expiresAt: started + 30 * minute,
  draft: { 11: 42, 12: 'my answer' },
}

test('a sitting survives the page it was started on', () => {
  local.clear()
  writeAttempt('4', attempt)

  const resumed = readAttempt('4', '6')
  assert.deepEqual(resumed, attempt)
  // The deadline is the one it was started with, not a fresh half hour.
  assert.equal(resumed?.expiresAt, started + 30 * minute)
})

test('one student on a shared device cannot resume another one', () => {
  local.clear()
  writeAttempt('4', attempt)

  assert.equal(readAttempt('9', '6'), null)
  assert.equal(readAttempt('4', '7'), null)
  assert.notEqual(attemptKey('4', '6'), attemptKey('9', '6'))
})

test('nothing is stored against a student the page cannot name', () => {
  local.clear()
  writeAttempt('', attempt)
  assert.equal(local.length, 0)
  assert.equal(readAttempt('', '6'), null)
})

test('submitting leaves nothing behind to resume', () => {
  local.clear()
  writeAttempt('4', attempt)
  clearAttempt('4', '6')
  assert.equal(readAttempt('4', '6'), null)
})

test('a stored value that is not an attempt is no attempt', () => {
  assert.equal(parseAttempt(null, '6'), null)
  assert.equal(parseAttempt('nonsense', '6'), null)
  // Another assignment's sitting must never be resumed against this one.
  assert.equal(parseAttempt({ ...attempt, assignmentId: '7' }, '6'), null)
  assert.equal(parseAttempt({ ...attempt, startedAt: 'ten o clock' }, '6'), null)
  assert.equal(parseAttempt({ ...attempt, expiresAt: 'never' }, '6'), null)
})

test('a hand-edited store cannot crash the sitting or smuggle in answers', () => {
  local.clear()
  local.setItem(attemptKey('4', '6'), '{ this is not json')
  assert.equal(readAttempt('4', '6'), null)

  const parsed = parseAttempt(
    { ...attempt, draft: { 11: 42, hello: 'world', 12: { nested: true } } },
    '6',
  )
  assert.deepEqual(parsed?.draft, { 11: 42 })
})

test('an assignment with no time limit runs no clock', () => {
  assert.equal(attemptExpiry(started, null, started + 5 * minute), null)
})

test('the time allowed ends the sitting', () => {
  assert.equal(attemptExpiry(started, 30 * 60, null), started + 30 * minute)
})

test('an assignment closing sooner than the time allowed brings the clock forward', () => {
  assert.equal(attemptExpiry(started, 30 * 60, started + 5 * minute), started + 5 * minute)
  // And a closing time after it changes nothing.
  assert.equal(attemptExpiry(started, 30 * 60, started + 90 * minute), started + 30 * minute)
})

test('a closing time already past is ignored rather than obeyed', () => {
  // The server has just said the assignment can be sat. A clock a few seconds
  // out must not submit a blank paper the instant the student starts.
  assert.equal(attemptExpiry(started, 30 * 60, started - minute), started + 30 * minute)
})
