import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Contact } from '../../api/conversations/types.ts'
import { contactLabel, contactOptions, contactRoles, matchesContact } from './contacts.ts'

const contact = (over: Partial<Contact>): Contact => ({
  user_id: 1,
  name: 'A Teacher',
  role_id: 3,
  role: 'Teacher',
  why: null,
  ...over,
})

test('two logins of one name are both offered, and both labelled', () => {
  const options = contactOptions([
    contact({ user_id: 350, name: 'Dr. IKECHUKWU AYOGU' }),
    contact({ user_id: 351, name: 'Dr. IKECHUKWU AYOGU' }),
  ])
  assert.equal(options.length, 2)
  assert.deepEqual(options.map(contactLabel), [
    'Dr. IKECHUKWU AYOGU · login 350',
    'Dr. IKECHUKWU AYOGU · login 351',
  ])
})

test('a name held once is shown plainly', () => {
  const [only] = contactOptions([contact({ user_id: 62, name: 'Fr. John Ezenwankwo' })])
  assert.equal(contactLabel(only), 'Fr. John Ezenwankwo')
})

test('one name in two roles is two people, not a duplicate', () => {
  const options = contactOptions([
    contact({ user_id: 5, name: 'Ada Obi', role: 'Teacher' }),
    contact({ user_id: 6, name: 'Ada Obi', role: 'Parent' }),
  ])
  assert.deepEqual(options.map((option) => option.ambiguous), [false, false])
})

test('words match separately and in any order', () => {
  const [option] = contactOptions([contact({ name: 'Dr. IKECHUKWU AYOGU' })])
  assert.equal(matchesContact(option, 'ayogu ikechukwu'), true)
  assert.equal(matchesContact(option, 'ayogu okafor'), false)
  assert.equal(matchesContact(option, ''), true)
})

test('the role is searchable, so "parent" narrows to guardians', () => {
  const [option] = contactOptions([contact({ role: 'Parent' })])
  assert.equal(matchesContact(option, 'parent'), true)
})

test('roles come back sorted, with a missing one called Other', () => {
  const options = contactOptions([
    contact({ user_id: 1, role: 'Teacher' }),
    contact({ user_id: 2, role: 'Administrator' }),
    contact({ user_id: 3, role: '' }),
  ])
  assert.deepEqual(contactRoles(options), ['Administrator', 'Other', 'Teacher'])
})

test('an unnamed account is still pickable', () => {
  const [option] = contactOptions([contact({ name: '   ' })])
  assert.equal(option.name, 'Unnamed account')
})
