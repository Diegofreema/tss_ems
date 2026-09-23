import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canChange, isUnsynced } from './unsynced.ts'

test('a row the school issued an id for is an ordinary row', () => {
  assert.equal(isUnsynced({ id: '42' }), false)
  assert.equal(isUnsynced({ id: 'TSS168/2' }), false)
})

test('a row this device named is unsynced', () => {
  assert.equal(isUnsynced({ id: 'local:0b9f-...' }), true)
})

/*
 * The whole point of the rule: nothing may be built on a record the school has
 * never heard of, because the op would name an id that does not exist yet.
 */
test('an unsynced row may not be changed', () => {
  assert.equal(canChange({ id: 'local:1' }), false)
  assert.equal(canChange({ id: 'local:1' }, () => true), false)
})

test('a synced row may be changed', () => {
  assert.equal(canChange({ id: '7' }), true)
})

test("a register's own refusal is kept, not replaced", () => {
  // An office record only a super administrator may remove.
  assert.equal(canChange({ id: '7' }, () => false), false)
  assert.equal(canChange({ id: '7' }, () => true), true)
})
