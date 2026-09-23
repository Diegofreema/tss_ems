import assert from 'node:assert/strict'
import { test } from 'node:test'
import { distinct, toOptions } from './options.ts'

test('a label nobody shares is left exactly as the school wrote it', () => {
  assert.deepEqual(
    distinct([
      { value: '1', label: 'JSS 1', meta: 'J1' },
      { value: '7', label: 'SSS II' },
    ]),
    [
      { value: '1', label: 'JSS 1' },
      { value: '7', label: 'SSS II' },
    ],
  )
})

test('a repeated label takes whatever the feed could find to tell it apart', () => {
  assert.deepEqual(
    distinct([
      { value: '3', label: 'Alpha', meta: 'A-DAY' },
      { value: '4', label: 'Alpha', meta: 'A-EVE' },
    ]).map((one) => one.label),
    ['Alpha · A-DAY', 'Alpha · A-EVE'],
  )
})

test('with nothing to tell them apart it falls back to the ids, which differ', () => {
  // Bronze really does hold two classes named SSS I, both coded SSS I.
  assert.deepEqual(
    distinct([
      { value: '2', label: 'SSS I', meta: '' },
      { value: '6', label: 'SSS I' },
    ]).map((one) => one.label),
    ['SSS I · #2', 'SSS I · #6'],
  )
})

test('a bare string choice is its own value', () => {
  assert.deepEqual(toOptions(['Male', { value: 'success', label: 'Paid' }]), [
    { value: 'Male', label: 'Male' },
    { value: 'success', label: 'Paid' },
  ])
})
