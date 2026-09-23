import assert from 'node:assert/strict'
import { test } from 'node:test'
import { greeting } from './greeting.ts'

test('the greeting follows the clock', () => {
  assert.equal(greeting(new Date(2026, 7, 30, 8)), 'Good morning')
  assert.equal(greeting(new Date(2026, 7, 30, 13)), 'Good afternoon')
  assert.equal(greeting(new Date(2026, 7, 30, 19)), 'Good evening')
})
