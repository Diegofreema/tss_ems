import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Admin } from '../../api/users/types.ts'
import { adminProfile } from './profile.ts'

/** `GET /admins/profile`, trimmed to what the page reads. */
const ADMIN = {
  id: 1,
  user_id: 1,
  surname: 'Ugnana',
  lastname: 'Ojukwu',
  status: 'active',
  date_created: '2019-08-09T14:13:00+00:00',
  adminphoto: null,
  gender: 'Male',
  department_id: 1,
  phone: '08111222333',
  address: 'obinze',
  dob: '',
  profile: 'old teacher',
  privileges: [
    { id: 1, name: 'Admission' },
    { id: 2, name: 'Student' },
  ],
  department: { id: 1, name: 'JSS 1', deptcode: 'JSS 1' },
  user: {
    id: 1,
    username: 'chukwudi.aniegboka@netpro.africa',
    userstatus: 'Enabled',
    role: { id: 5, role_name: 'Super Admin' },
  },
} as unknown as Admin

test('the form is filled from the record the save writes back to', () => {
  const config = adminProfile(ADMIN)
  // Not the login's name, which is a different pair of words on a different
  // row — saving that would have copied it over the office record.
  assert.equal(config.values.fullname, 'Ugnana Ojukwu')
  assert.equal(config.values.phone, '08111222333')
  assert.equal(config.values.address, 'obinze')
  assert.equal(config.values.job, 'old teacher')
  assert.equal(config.initials, 'UO')
})

test('what the office holds and what the login holds are told apart', () => {
  const config = adminProfile(ADMIN)
  assert.equal(config.meta, 'Super Admin · JSS 1 · old teacher')
  assert.deepEqual(config.account, [
    { label: 'Signs in with', value: 'chukwudi.aniegboka@netpro.africa' },
    { label: 'Account', value: 'Super Admin' },
    { label: 'Sign-in', value: 'Enabled' },
    { label: 'On record since', value: '09 Aug 2019' },
  ])
})

test('the privileges are read, not typed into', () => {
  const config = adminProfile(ADMIN)
  assert.equal(config.values.privileges, 'Admission, Student')
  assert.ok(config.fields.find((field) => field.key === 'privileges')?.locked)
})

test('an account holding nothing says so rather than reading blank', () => {
  const config = adminProfile({ ...ADMIN, privileges: [] })
  assert.match(config.values.privileges, /Nothing yet/)
})

test('a record that did not answer leaves the page to the session', () => {
  const config = adminProfile()
  assert.equal(config.fromRecord, undefined)
  assert.equal(config.values.fullname, '')
})
