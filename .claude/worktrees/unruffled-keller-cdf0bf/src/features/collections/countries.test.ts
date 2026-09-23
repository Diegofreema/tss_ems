import assert from 'node:assert/strict'
import { test } from 'node:test'
import { countryOptions, stateOptions } from './countries.ts'
import { countryIso, schoolCountryId } from './country-ids.ts'

test('a country submits its ISO code and the school’s number is looked up', () => {
  const options = countryOptions()
  assert.equal(options.length, 250)
  assert.deepEqual(
    options.find((one) => one.value === 'NG'),
    { value: 'NG', label: 'Nigeria' },
  )
  assert.equal(schoolCountryId('NG'), 160)
  assert.equal(countryIso(160), 'NG')
  // No package numbers countries the way this server does — the one that
  // supplies these names puts Nigeria 159th, and the server holds 160.
  assert.notEqual(options.findIndex((one) => one.value === 'NG') + 1, schoolCountryId('NG'))
})

test('a country the school has no number for resolves to nothing, not to zero', () => {
  assert.equal(schoolCountryId('FR'), undefined)
  assert.equal(schoolCountryId(''), undefined)
  assert.equal(schoolCountryId(undefined), undefined)
  assert.equal(countryIso(0), '')
  assert.equal(countryIso(999), '')
})

test('Nigeria’s states carry the ids this server actually answers with', () => {
  const states = stateOptions('NG')
  assert.equal(states.length, 37)
  // The two read back off bronze: teacher 2 lives in state 2658 (Ebonyi) and
  // administrator 4 in 2663 (Imo). Both fix the base and the ordering.
  assert.equal(states.find((one) => one.label === 'Ebonyi')?.value, '2658')
  assert.equal(states.find((one) => one.label === 'Imo')?.value, '2663')
  assert.equal(states[0].value, '2647')
  assert.equal(states[36].value, '2683')
})

test('states are offered only where the school’s numbering is known', () => {
  // Rather than offering numbers that would file a teacher in another country.
  assert.deepEqual(stateOptions('GH'), [])
  assert.deepEqual(stateOptions(''), [])
})
