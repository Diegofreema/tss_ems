import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nameOf } from './name-of.ts'

/*
 * `class_arm` is typed as a string and arrives on this deployment as an object.
 * A `.trim()` on a record is a TypeError, not a wrong answer, so this took the
 * whole timetable page down to its error boundary rather than showing a dash.
 */
test('a name field reads whether the school sends a name or the record', () => {
  assert.equal(nameOf('JSS 3 B'), 'JSS 3 B')
  assert.equal(nameOf({ arm_name: 'B' }), 'B')
  assert.equal(nameOf({ name: 'JSS 3' }), 'JSS 3')
  assert.equal(nameOf({ title: 'Upper Six' }), 'Upper Six')
})

test('a name field that holds nothing usable reads as nothing', () => {
  assert.equal(nameOf(null), '')
  assert.equal(nameOf(undefined), '')
  assert.equal(nameOf(''), '')
  assert.equal(nameOf({}), '')
  assert.equal(nameOf({ arm_name: '   ' }), '')
  assert.equal(nameOf(7), '')
})
