import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Parent } from '../../api/parents/types.ts'
import { guardianOption } from './guardian-option.ts'

const parent: Parent = {
  id: 7, user_id: 41,
  fathersname: 'Emmanuel Udo', mothersname: 'Chidinma Udo',
  pemailaddress: 'e.udo@example.com',
  fatherphone: '08034412280', motherphone: '08126607714',
  fathersjob: null, mothersjob: null,
  address: '14 Ogui Road, Enugu', occupation: null,
  status: 'active',
}

test('the option submits the household id and shows both parents', () => {
  const option = guardianOption(parent)
  assert.equal(option.value, '7')
  assert.equal(option.label, 'Emmanuel Udo & Chidinma Udo')
})

test('one parent on record is named alone, with no stray ampersand', () => {
  assert.equal(guardianOption({ ...parent, mothersname: null }).label, 'Emmanuel Udo')
  assert.equal(guardianOption({ ...parent, fathersname: '  ' }).label, 'Chidinma Udo')
})

test('a household with no name is still pickable', () => {
  const nameless = { ...parent, fathersname: null, mothersname: null }
  assert.equal(guardianOption(nameless).label, 'e.udo@example.com')
  assert.equal(guardianOption({ ...nameless, pemailaddress: null }).label, 'Guardian 7')
})
