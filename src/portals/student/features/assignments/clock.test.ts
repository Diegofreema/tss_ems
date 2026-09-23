import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  formatClock,
  isRunningOut,
  remainingSeconds,
  secondsLeft,
  WARNING_SECONDS,
} from './clock.ts'

test('the clock pads seconds and never goes negative', () => {
  assert.equal(formatClock(1495), '24:55')
  assert.equal(formatClock(305), '5:05')
  assert.equal(formatClock(60), '1:00')
  assert.equal(formatClock(9), '0:09')
  assert.equal(formatClock(0), '0:00')
  assert.equal(formatClock(-5), '0:00')
})

test('the clock turns accent under five minutes', () => {
  assert.equal(isRunningOut(WARNING_SECONDS), false)
  assert.equal(isRunningOut(WARNING_SECONDS - 1), true)
  assert.equal(isRunningOut(0), true)
})

test('what is left is read off the deadline, not counted down', () => {
  const now = Date.parse('2026-09-03T10:00:00')
  assert.equal(remainingSeconds(now + 30 * 60 * 1000, now), 1800)
  // Half a second left still reads a second: the clock reaches 0:00 at the
  // deadline itself, not for the whole second before it.
  assert.equal(remainingSeconds(now + 500, now), 1)
  assert.equal(remainingSeconds(now, now), 0)
})

test('time spent away from the page is time spent', () => {
  const now = Date.parse('2026-09-03T10:00:00')
  const deadline = now + 30 * 60 * 1000
  // The same deadline, read ten minutes later — whether or not the tab was
  // awake to tick in between.
  assert.equal(remainingSeconds(deadline, now + 10 * 60 * 1000), 1200)
  assert.equal(remainingSeconds(deadline, deadline + 60_000), 0)
})

test('an assignment with no deadline has nothing left to run', () => {
  assert.equal(remainingSeconds(null, Date.now()), 0)
})

test('a span is shown as whole seconds, and never as a negative one', () => {
  assert.equal(secondsLeft(1800 * 1000), 1800)
  assert.equal(secondsLeft(1), 1)
  assert.equal(secondsLeft(0), 0)
  assert.equal(secondsLeft(-90_000), 0)
})

test('the sitting is timed by whichever clock says there is less left', () => {
  // What the hook compares: real seconds elapsed since the sitting was read in,
  // against the deadline on the school's clock. The smaller wins, so a device
  // clock wound backwards — which only ever raises the second figure — cannot
  // put time back on the assignment.
  const bySitting = 180_000 - 60_000
  const byClockWoundBack = 180_000
  assert.equal(secondsLeft(Math.min(bySitting, byClockWoundBack)), 120)

  // And a page reopened an hour later is over, whatever the sitting counted.
  assert.equal(secondsLeft(Math.min(120_000, -3_600_000)), 0)
})
