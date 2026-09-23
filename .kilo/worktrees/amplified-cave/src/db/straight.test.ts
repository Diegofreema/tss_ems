import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { OutboxOp, OpState } from './outbox.ts'
import { mayGoStraight } from './straight.ts'

const op = (state: OpState): OutboxOp => ({
  id: `op-${state}`,
  seq: 1,
  handler: 'anything',
  payload: {},
  collectionId: null,
  targetKey: null,
  dependsOn: [],
  createdAt: 0,
  attempts: 0,
  nextAttemptAt: 0,
  state,
  lastError: null,
  toast: { success: 'Saved' },
  label: 'A write',
})

test('an empty queue on a live connection goes straight to the school', () => {
  assert.equal(mayGoStraight(true, false, []), true)
})

test('no connection means no wire', () => {
  assert.equal(mayGoStraight(false, false, []), false)
})

test('a session the school has already refused is not tried again', () => {
  assert.equal(mayGoStraight(true, true, []), false)
})

test('nothing overtakes work still expected to land', () => {
  // Sending this one now would put it in front of a write made before it.
  assert.equal(mayGoStraight(true, false, [op('queued')]), false)
  assert.equal(mayGoStraight(true, false, [op('sending')]), false)
})

test('work waiting on a person does not block the wire', () => {
  // A failed op is not going anywhere until somebody looks at it, and holding
  // every later write behind it would wedge the app on one refusal.
  assert.equal(mayGoStraight(true, false, [op('failed')]), true)
})

test('work that needs deciding does block it', () => {
  // Unlike `failed`, these two may yet be sent — a `needs-review` op was in
  // flight when the tab died and a `conflict` is waiting on an answer — so a
  // write made now could still end up behind them.
  assert.equal(mayGoStraight(true, false, [op('needs-review')]), false)
  assert.equal(mayGoStraight(true, false, [op('conflict')]), false)
})

test('one open op among settled ones is enough to hold the queue', () => {
  assert.equal(mayGoStraight(true, false, [op('failed'), op('queued')]), false)
})
