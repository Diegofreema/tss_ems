import assert from 'node:assert/strict'
import { test } from 'node:test'
import { queueStuck, syncMessage, syncSurface } from './message.ts'

const state = (over: Partial<Parameters<typeof syncMessage>[0]> = {}) =>
  syncMessage({ online: true, durable: true, waiting: 0, needsAnswer: 0, ...over })

test('offline with a durable device promises the send, because it can keep it', () => {
  const said = state({ online: false, waiting: 3 })
  assert.match(said, /saved on this device/)
  assert.match(said, /3 changes are/)
})

test('offline with nowhere to store it promises nothing of the kind', () => {
  const said = state({ online: false, durable: false, waiting: 2 })
  assert.match(said, /cannot save work between visits/)
  assert.match(said, /Keep this tab open/)
  // The old copy's promise must not survive anywhere in this branch.
  assert.doesNotMatch(said, /will send when the connection returns/)
})

test('a browser that cannot store warns before anything is typed, not after', () => {
  const said = state({ online: false, durable: false })
  assert.match(said, /lost if you close this tab/)
})

test('anything needing a person outranks everything else', () => {
  const said = state({ online: false, durable: false, waiting: 9, needsAnswer: 1 })
  assert.equal(said, '1 change needs your attention before it can be saved to the school.')
})

test('connected and waiting says only what it knows: the device is trying', () => {
  // Not "to the school". The device has it and is trying; where the trying is
  // what has gone wrong, naming the school reads as a delivery this sentence
  // cannot promise.
  assert.equal(state({ waiting: 1 }), '1 change is still being sent.')
  assert.equal(state({ waiting: 4 }), '4 changes are still being sent.')
})

test('one reads as one and two read as two', () => {
  assert.match(state({ needsAnswer: 2 }), /^2 changes need your attention before they can/)
  assert.match(state({ online: false, waiting: 1 }), /1 change is saved on this device/)
})

/*
 * Which surface speaks. The bar is for moments that need a person; offline on
 * a durable device is a chip; a healthy queue says nothing at all.
 */
const surface = (over: Partial<Parameters<typeof syncSurface>[0]> = {}) =>
  syncSurface({
    online: true,
    durable: true,
    waiting: 0,
    needsAnswer: 0,
    stuck: false,
    ...over,
  })

test('connected with nothing waiting is silence', () => {
  assert.deepEqual(surface(), { kind: 'quiet' })
})

test('a healthy queue sending in the background is also silence', () => {
  // This is the flash the bar used to make on every save — a second of "still
  // being sent" that taught readers background sending needed watching.
  assert.deepEqual(surface({ waiting: 3 }), { kind: 'quiet' })
})

test('a stuck queue gets the bar, and the bar gets its button', () => {
  assert.deepEqual(surface({ waiting: 3, stuck: true }), { kind: 'bar', sendNow: true })
})

test('stuck with nothing waiting is nothing to send, so silence', () => {
  assert.deepEqual(surface({ stuck: true }), { kind: 'quiet' })
})

test('offline on a device that keeps work is a chip, not a bar', () => {
  assert.deepEqual(surface({ online: false }), { kind: 'chip', label: 'Offline' })
  assert.deepEqual(surface({ online: false, waiting: 2 }), {
    kind: 'chip',
    label: 'Offline · 2 saved',
  })
})

test('offline with nowhere to store work is still the loud bar', () => {
  // The one offline state that can lose somebody's work.
  assert.deepEqual(surface({ online: false, durable: false }), {
    kind: 'bar',
    sendNow: false,
  })
})

test('anything needing a person outranks every other surface', () => {
  assert.deepEqual(surface({ online: false, needsAnswer: 1 }), {
    kind: 'bar',
    sendNow: false,
  })
  assert.deepEqual(surface({ waiting: 4, stuck: true, needsAnswer: 1 }), {
    kind: 'bar',
    sendNow: false,
  })
})

/*
 * What "stuck" means: a queued op that has already failed once and is serving
 * out a backoff, or the queue paused on an expired token. An op merely in
 * flight — or queued behind one — is the background doing its job.
 */
test('a first attempt in flight is busy, not stuck', () => {
  assert.equal(queueStuck([{ state: 'sending', attempts: 0 }], false), false)
  assert.equal(
    queueStuck(
      [
        { state: 'sending', attempts: 0 },
        { state: 'queued', attempts: 0 },
      ],
      false,
    ),
    false,
  )
})

test('a queued op that has failed before is stuck', () => {
  assert.equal(queueStuck([{ state: 'queued', attempts: 2 }], false), true)
})

test('the auth pause is stuck whatever the ops say', () => {
  assert.equal(queueStuck([{ state: 'queued', attempts: 0 }], true), true)
  assert.equal(queueStuck([], true), true)
})

test('an op already in the drawer does not make the queue stuck', () => {
  // Failed and needs-review ops are the red bar's business, not this one's.
  assert.equal(queueStuck([{ state: 'failed', attempts: 3 }], false), false)
  assert.equal(queueStuck([{ state: 'needs-review', attempts: 1 }], false), false)
})
