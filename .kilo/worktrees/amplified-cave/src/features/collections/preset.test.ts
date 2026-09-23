import assert from 'node:assert/strict'
import test from 'node:test'
import { presetSearch } from './preset.ts'

test('a value the link wrote is carried through as it was written', () => {
  assert.deepEqual(presetSearch({ subject_id: '4' }), { subject_id: '4' })
})

test('a hand-typed id arrives as a number and still names the same record', () => {
  // The router parses search values as JSON, so `?subject_id=4` is not a string.
  assert.deepEqual(presetSearch({ subject_id: 4 }), { subject_id: '4' })
})

test('anything that is not a value a field could hold is left out', () => {
  assert.deepEqual(
    presetSearch({ ok: 'yes', nested: { id: 1 }, many: ['a'], missing: null, off: false }),
    { ok: 'yes' },
  )
})

test('nothing in the URL is nothing to seed', () => {
  assert.deepEqual(presetSearch({}), {})
})
