import assert from 'node:assert/strict'
import { test } from 'node:test'
import { RESEND_SECONDS, resendLabel, waitLeft } from './resend.ts'

const AT = Date.parse('2026-09-16T09:00:00+01:00')
const SENT = { to: 'teacher@netpro.africa', at: AT }

test('the wait is a full minute at the moment the code goes', () => {
  assert.equal(RESEND_SECONDS, 60)
  assert.equal(waitLeft(SENT, 'teacher@netpro.africa', AT), 60)
})

test('it counts down, and reaches zero exactly on the minute', () => {
  assert.equal(waitLeft(SENT, 'teacher@netpro.africa', AT + 1_000), 59)
  assert.equal(waitLeft(SENT, 'teacher@netpro.africa', AT + 59_900), 1)
  assert.equal(waitLeft(SENT, 'teacher@netpro.africa', AT + 60_000), 0)
  assert.equal(waitLeft(SENT, 'teacher@netpro.africa', AT + 600_000), 0)
})

test('nothing sent yet is no wait at all', () => {
  assert.equal(waitLeft({ to: null, at: null }, 'teacher@netpro.africa', AT), 0)
})

test('a different address is a different request and waits for nothing', () => {
  // Somebody who mistyped their own email must not be held for a minute over
  // a code that went to an address they do not read.
  assert.equal(waitLeft(SENT, 'someone.else@netpro.africa', AT + 1_000), 0)
})

test('the same address typed differently is the same address', () => {
  assert.equal(waitLeft(SENT, '  Teacher@Netpro.Africa ', AT + 1_000), 59)
})

test('a clock that jumps backwards does not lock the screen', () => {
  assert.equal(waitLeft(SENT, 'teacher@netpro.africa', AT - 3_600_000), 0)
})

test('the button says how long is left, then offers itself again', () => {
  assert.equal(resendLabel(47), 'Send it again in 47s')
  assert.equal(resendLabel(1), 'Send it again in 1s')
  assert.equal(resendLabel(0), 'Send it again')
  assert.equal(resendLabel(12, true), 'Sending…')
})
