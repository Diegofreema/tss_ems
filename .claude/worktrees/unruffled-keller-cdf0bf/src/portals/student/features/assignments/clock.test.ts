import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatClock, isRunningOut, WARNING_SECONDS } from './clock.ts'

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
