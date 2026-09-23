import assert from 'node:assert/strict'
import { test } from 'node:test'
import { profileFromAccount } from './from-account.ts'
import type { ProfileConfig } from './types.ts'

/** The live /users/me payload, trimmed to what the page reads. */
const admin = {
  user: {
    username: 'chukwudi.aniegboka@netpro.africa',
    fname: 'Chukwudi',
    lname: 'Aniegboka',
    phone: '0803 441 9920',
    address: null,
  },
  role: { id: 5, role_name: 'Super Admin' },
  profile_type: 'admin',
  profile: { department: { name: 'Bursary' } },
} as never

const teacher = { ...(admin as object), profile_type: 'teacher' } as never

const portal = {
  initials: 'AO',
  meta: 'Bursar · STF-003',
  fields: [
    { key: 'fullname', label: 'Full name', required: true },
    { key: 'staffno', label: 'Staff number', locked: true },
  ],
  values: { fullname: 'Amaka Okonkwo', staffno: 'STF-003', phone: '0000', address: '14 Bode Thomas' },
  account: [
    { label: 'Signs in with', value: 'amaka.okonkwo@netpro.africa' },
    { label: 'Two-step', value: 'Off' },
  ],
} as unknown as ProfileConfig

test('the page is rewritten around the person signed in', () => {
  const merged = profileFromAccount(portal, admin)
  assert.equal(merged.initials, 'CA')
  assert.equal(merged.meta, 'Super Admin · Bursary')
  assert.equal(merged.values.fullname, 'Chukwudi Aniegboka')
  assert.equal(merged.values.phone, '0803 441 9920')
  assert.equal(merged.account[0].value, 'chukwudi.aniegboka@netpro.africa')
})

test('a field the account has no answer for keeps the portal wording', () => {
  const merged = profileFromAccount(portal, admin)
  assert.equal(merged.values.staffno, 'STF-003')
  assert.equal(merged.account[1].value, 'Off')
})

test('a blank the school holds is shown as a blank, not as the placeholder', () => {
  assert.equal(profileFromAccount(portal, admin).values.address, '')
})

test('an administrator keeps the fields the portal made editable', () => {
  assert.deepEqual(
    profileFromAccount(portal, admin).fields.map((field) => field.locked),
    [undefined, true],
  )
})

test('a role with no endpoint of its own gets a read-only record', () => {
  assert.deepEqual(
    profileFromAccount(portal, teacher).fields.map((field) => field.locked),
    [true, true],
  )
})
