import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blockedReason } from './blocked.ts'

const state = (over: Partial<Parameters<typeof blockedReason>[0]> = {}) => ({
  problems: 0,
  pending: 1,
  hasTerm: true,
  looking: false,
  ...over,
})

test('a sheet ready to file gives no reason at all', () => {
  assert.equal(blockedReason(state()), '')
})

test('a flagged mark is the reader\u2019s own to fix, so it is said first', () => {
  assert.equal(blockedReason(state({ problems: 1 })), 'Fix the flagged mark first.')
  assert.equal(blockedReason(state({ problems: 3 })), 'Fix the 3 flagged marks first.')
})

test('a flagged mark outranks every other reason', () => {
  assert.equal(
    blockedReason(state({ problems: 2, pending: 0, hasTerm: false })),
    'Fix the 2 flagged marks first.',
  )
})

test('an unknown term says so, and says when it is still looking', () => {
  assert.equal(
    blockedReason(state({ hasTerm: false })),
    'The term this would be filed into cannot be read yet.',
  )
  assert.equal(
    blockedReason(state({ hasTerm: false, looking: true })),
    'Checking which term to file into\u2026',
  )
})

test('a sheet nobody has typed into says the ordinary thing', () => {
  assert.equal(blockedReason(state({ pending: 0 })), 'Nothing typed yet.')
})
