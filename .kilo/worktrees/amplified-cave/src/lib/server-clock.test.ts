import assert from 'node:assert/strict'
import { test } from 'node:test'
import { noteServerTime, serverNow, usableOffset } from './server-clock.ts'

/** Within a second of each other, which is all the `Date` header resolves to. */
function near(actual: number, expected: number, slack = 1500) {
  assert.ok(
    Math.abs(actual - expected) < slack,
    `${actual} is not within ${slack}ms of ${expected}`,
  )
}

test('the clock follows the school, not the device', () => {
  const ahead = Date.now() + 10 * 60 * 1000
  noteServerTime(new Date(ahead).toUTCString())
  near(serverNow(), ahead)
})

test('a response with no usable date leaves the anchor where it was', () => {
  const ahead = Date.now() + 10 * 60 * 1000
  noteServerTime(new Date(ahead).toUTCString())

  noteServerTime(null)
  noteServerTime('')
  noteServerTime('sometime on Tuesday')
  near(serverNow(), ahead)
})

test('the next answer re-anchors it', () => {
  noteServerTime(new Date(Date.now() + 10 * 60 * 1000).toUTCString())
  noteServerTime(new Date().toUTCString())
  near(serverNow(), Date.now())
})

/*
 * The anchor is kept in `localStorage` so an offline reload does not go back to
 * trusting the device's own clock. What comes back out is whatever was last
 * written there by anybody, so it is worth nothing until it has been read as a
 * plausible number.
 */
test('a missing or empty anchor is no anchor', () => {
  assert.equal(usableOffset(null), 0)
  assert.equal(usableOffset(undefined), 0)
  assert.equal(usableOffset(''), 0)
})

test('a stored anchor is used', () => {
  assert.equal(usableOffset('600000'), 600_000)
  assert.equal(usableOffset('-600000'), -600_000)
})

test('nonsense is not read as a number', () => {
  assert.equal(usableOffset('sometime on Tuesday'), 0)
  assert.equal(usableOffset('NaN'), 0)
  assert.equal(usableOffset('Infinity'), 0)
  assert.equal(usableOffset({}), 0)
})

/*
 * Past this, the device's own clock must have been changed since the offset was
 * measured — the school is not two days out of step with the world — and a
 * wrong correction is worse than none.
 */
test('an implausible anchor is discarded rather than applied', () => {
  const twoDays = 2 * 24 * 60 * 60 * 1000
  assert.equal(usableOffset(String(twoDays + 1)), 0)
  assert.equal(usableOffset(String(-twoDays - 1)), 0)
  assert.equal(usableOffset(String(twoDays - 1)), twoDays - 1)
})
