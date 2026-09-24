import assert from 'node:assert/strict'
import { test } from 'node:test'
import { namedOptions } from './named-options.ts'

/** `GET /departments` as it answered a signed-out request on 2026-09-24. */
const CLASSES = [
  { id: 39, name: 'JSS 3' },
  { id: 1, name: 'JSS I' },
  { id: 2, name: 'JSS II' },
  { id: 5, name: 'JSS III' },
  { id: 38, name: 'SS III' },
  { id: 6, name: 'SSS I' },
  { id: 7, name: 'SSS II' },
]

/** `GET /lgas?state_id=2648`, the same day — ids not in name order. */
const LGAS = [
  { id: 770, name: 'Abaji' },
  { id: 771, name: 'Abuja' },
  { id: 773, name: 'Bwari' },
  { id: 772, name: 'Gwagwalada' },
]

test('every row is offered, valued by its id', () => {
  const options = namedOptions(CLASSES)
  assert.equal(options.length, 7)
  assert.deepEqual(options.find((option) => option.label === 'JSS I'), { value: '1', label: 'JSS I' })
})

test('the list states its own order rather than the endpoint row order', () => {
  assert.deepEqual(
    namedOptions(CLASSES).map((option) => option.label),
    ['JSS 3', 'JSS I', 'JSS II', 'JSS III', 'SS III', 'SSS I', 'SSS II'],
  )
  assert.deepEqual(
    namedOptions([...LGAS].reverse()).map((option) => option.value),
    ['770', '771', '773', '772'],
  )
  assert.deepEqual(
    namedOptions([{ id: 1, name: 'Year 10' }, { id: 2, name: 'Year 9' }]).map((o) => o.label),
    ['Year 9', 'Year 10'],
  )
})

test('a row with no name is not offered', () => {
  assert.deepEqual(namedOptions([{ id: 1, name: ' ' }, { id: 2, name: null }]), [])
})
