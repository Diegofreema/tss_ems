import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blockedReason } from './blocked.ts'

test('nothing is in the way while there is a connection', () => {
  assert.equal(blockedReason({}, true), undefined)
  assert.equal(blockedReason({ queue: () => {} }, true), undefined)
})

test('a form that writes through the queue saves with no connection', () => {
  assert.equal(blockedReason({ queue: () => {} }, false), undefined)
})

/*
 * The honest version of letting somebody fill in two pages and then fail: a
 * form carrying a file has no body the queue could hold, and a create that
 * reads the school before writing has nothing to read when there is no school.
 */
test('a form that writes straight to the school says so before it is filled in', () => {
  const reason = blockedReason({}, false)
  assert.ok(reason && reason.includes('needs a connection'))
})
