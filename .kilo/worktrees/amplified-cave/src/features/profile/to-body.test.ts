import assert from 'node:assert/strict'
import { test } from 'node:test'
import { profileBody } from './to-body.ts'

test('the name is read back apart the way the record filled it in', () => {
  // The form is prefilled from the office record, surname first, so the first
  // word of the box is the surname however the school uses the two words.
  assert.deepEqual(profileBody({ fullname: 'Ugnana Ojukwu' }), {
    surname: 'Ugnana',
    lastname: 'Ojukwu',
    phone: undefined,
    address: undefined,
    profile: undefined,
  })
})

test('everything after the first word stays with the second half', () => {
  const body = profileBody({ fullname: 'Ada Nwosu Okafor' })
  assert.equal(body.surname, 'Ada')
  assert.equal(body.lastname, 'Nwosu Okafor')
})

test('a field the portal never showed is left out rather than blanked', () => {
  const body = profileBody({ fullname: 'Ada Okafor', phone: '0803' })
  assert.equal(body.address, undefined)
  assert.equal(body.phone, '0803')
})

test('the job goes back under the key the record keeps it in', () => {
  assert.equal(profileBody({ job: 'Registrar' }).profile, 'Registrar')
})

test('the keys the endpoint has no home for never reach it', () => {
  const body = profileBody({
    fullname: 'Ada Okafor',
    email: 'a@b.ng',
    staffno: 'STF-003',
    office: 'Block A',
  })
  assert.deepEqual(Object.keys(body).sort(), [
    'address',
    'lastname',
    'phone',
    'profile',
    'surname',
  ])
})
