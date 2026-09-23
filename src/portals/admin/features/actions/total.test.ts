import assert from 'node:assert/strict'
import { test } from 'node:test'
import { billing } from './total.ts'

const arms = [
  { key: 'SS1 A', label: 'SS1 A', meta: '35 students', count: 35 },
  { key: 'SS2 B', label: 'SS2 B', meta: '34 students', count: 34 },
  { key: 'SS3 A', label: 'SS3 A', meta: '31 students', count: 31 },
]

test('bills every student in the picked arms, not the arms', () => {
  assert.deepEqual(billing(arms, ['SS1 A', 'SS3 A'], 120_000), {
    students: 66,
    amount: 7_920_000,
  })
})

test('nothing picked bills nothing', () => {
  assert.deepEqual(billing(arms, [], 120_000), { students: 0, amount: 0 })
})

test('an arm that is no longer on the list is not billed', () => {
  assert.deepEqual(billing(arms, ['SS1 A', 'JSS9 Z'], 1000), {
    students: 35,
    amount: 35_000,
  })
})
