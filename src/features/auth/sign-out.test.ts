import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hasUnsentWork, signOutBody, signOutCta } from './sign-out.ts'

const NOTHING = { waiting: 0, needsAnswer: 0 }

test('a clean device is told what signing out clears', () => {
  assert.equal(
    signOutBody(NOTHING),
    'This clears the school’s records from this device, so the next person to open the browser finds nothing. You will need your password to sign back in.',
  )
})

test('signing out everywhere says it ends this session too', () => {
  // The button's own label says "my other devices", which is not what it does.
  assert.match(signOutBody(NOTHING, true), /including this one/)
  assert.equal(signOutCta(true), 'Sign out everywhere')
})

test('unsent work is named, and named as a loss', () => {
  assert.equal(
    signOutBody({ waiting: 3, needsAnswer: 0 }),
    '3 changes are saved on this device and have not reached the school. Signing out clears this device, so they will be lost. Send them first if you can.',
  )
})

test('one change reads as one, all the way through the sentence', () => {
  assert.equal(
    signOutBody({ waiting: 1, needsAnswer: 0 }),
    '1 change is saved on this device and has not reached the school. Signing out clears this device, so it will be lost. Send it first if you can.',
  )
})

test('work needing an answer counts as unsent, and both kinds add up', () => {
  assert.match(signOutBody({ waiting: 0, needsAnswer: 1 }), /^1 change is saved/)
  assert.match(signOutBody({ waiting: 2, needsAnswer: 2 }), /^4 changes are saved/)
})

test('the loss outranks the everywhere wording — it is the worse fact', () => {
  assert.equal(signOutBody({ waiting: 1, needsAnswer: 0 }, true), signOutBody({ waiting: 1, needsAnswer: 0 }))
})

test('unsent work is counted across both states', () => {
  assert.equal(hasUnsentWork(NOTHING), false)
  assert.equal(hasUnsentWork({ waiting: 0, needsAnswer: 2 }), true)
  assert.equal(hasUnsentWork({ waiting: 1, needsAnswer: 0 }), true)
})
