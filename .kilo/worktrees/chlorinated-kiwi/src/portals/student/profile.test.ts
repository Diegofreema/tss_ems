import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Student } from '../../api/my-schooling/types.ts'
import { studentContactBody, studentProfile } from './profile.ts'

/** `GET /students/me`, trimmed to what the page reads. */
const STUDENT = {
  id: 4,
  fname: 'UDOYE',
  lname: 'OKIGBO',
  mname: 'OZOMGBO',
  joindate: '2026-08-26T12:08:43+01:00',
  email: '',
  address: 'OWERRRI',
  phone: '09000000000',
  fathersname: '',
  mothersname: '',
  regno: 'CUN/2026/4',
  status: 'Admitted',
  sparent_id: 1,
  class_arm: { id: 4, arm_name: 'JSS 2 A' },
  department: { id: 2, name: 'SSS I' },
  user: { id: 483, username: 'UDOYE2608264308', userstatus: 'Enabled' },
} as unknown as Student

test('the form is filled from the student record', () => {
  const config = studentProfile(STUDENT)
  assert.equal(config.values.fullname, 'UDOYE OZOMGBO OKIGBO')
  assert.equal(config.values.phone, '09000000000')
  assert.equal(config.values.address, 'OWERRRI')
  assert.equal(config.initials, 'UO')
})

test('the arm is the class shown, and the term is left off', () => {
  const config = studentProfile(STUDENT)
  assert.equal(config.values.arm, 'JSS 2 A')
  assert.equal(config.values.adm, 'CUN/2026/4')
  assert.equal(config.meta, 'CUN/2026/4 · JSS 2 A')
})

test('a student with no arm falls back to the class the office filed them under', () => {
  const config = studentProfile({ ...STUDENT, class_arm: undefined })
  assert.equal(config.values.arm, 'SSS I')
})

test('an email the school never took reads as blank, not as a box', () => {
  const config = studentProfile(STUDENT)
  assert.equal(config.values.email, '—')
  assert.equal(config.fields.find((field) => field.key === 'email')?.locked, true)
})

test('no guardian anywhere on the page — it is the office\'s record, not the student\'s', () => {
  const config = studentProfile({ ...STUDENT, fathersname: 'Mr Okigbo' })
  assert.equal(config.fields.some((field) => field.key === 'guardian'), false)
  assert.equal(config.values.guardian, undefined)
  assert.equal(config.account.some((row) => /guardian/i.test(row.label)), false)
})

test('the login is read beside the record, not typed into', () => {
  assert.deepEqual(studentProfile(STUDENT).account, [
    { label: 'Signs in with', value: 'UDOYE2608264308' },
    { label: 'Sign-in', value: 'Enabled' },
    { label: 'On record since', value: '26 Aug 2026' },
  ])
})

test('only the phone and the address can be typed into', () => {
  const editable = studentProfile(STUDENT)
    .fields.filter((field) => !field.locked)
    .map((field) => field.key)
  assert.deepEqual(editable, ['phone', 'address'])
})

test('a record that did not answer leaves the page to the session', () => {
  const config = studentProfile()
  assert.equal(config.fromRecord, undefined)
  assert.equal(config.values.fullname, '')
})

test('the save sends the two fields the endpoint takes and nothing else', () => {
  const body = studentContactBody({
    fullname: 'Somebody Else',
    adm: 'CUN/2026/9',
    arm: 'SSS 3 A',
    email: 'typed@example.com',
    phone: ' 08122260140 ',
    address: '10 Wilfred Okereke street',
  })
  assert.deepEqual(body, { phone: '08122260140', address: '10 Wilfred Okereke street' })
})

test('an empty box is left out rather than blanking what the school holds', () => {
  assert.deepEqual(studentContactBody({ phone: '  ', address: '' }), {
    phone: undefined,
    address: undefined,
  })
})
