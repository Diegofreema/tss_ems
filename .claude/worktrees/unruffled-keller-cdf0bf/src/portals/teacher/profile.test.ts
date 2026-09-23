import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { MyTeachingProfile } from '../../api/teaching/types.ts'
import { teacherContactBody, teacherProfile } from './profile.ts'

/** `GET /teachers/me`, trimmed to what the page reads. */
const PROFILE = {
  teacher: {
    id: 2,
    user_id: 491,
    firstname: 'Teacher u 1',
    lastname: 'New Teacher',
    middlename: 'm',
    gender: 'Male',
    address: 'Address',
    phone: '08000000000',
    profile: 'About this teacher',
    qualification: 'BSc',
    date_created: '2026-08-26T12:40:48+01:00',
    department: { id: 1, name: 'JSS 1', deptcode: 'JSS 1' },
    subjects: [
      { id: 1, name: 'ENGLISH LANGUAGE' },
      { id: 2, name: 'MATHEMATICS' },
    ],
    user: {
      id: 491,
      username: 'teacher1@netpro.africa',
      useruniquid: 'CUN/Adm26/08/491',
      userstatus: 'Enabled',
    },
  },
  class_arms: [{ id: 3, arm_name: 'JSS1 A' }],
} as unknown as MyTeachingProfile

test('the form is filled from the teaching record', () => {
  const config = teacherProfile(PROFILE)
  assert.equal(config.values.fullname, 'Teacher u 1 m New Teacher')
  assert.equal(config.values.phone, '08000000000')
  assert.equal(config.values.address, 'Address')
  assert.equal(config.initials, 'TN')
})

test('the class, the arms and the subjects come off the record itself', () => {
  const config = teacherProfile(PROFILE)
  assert.equal(config.values.klass, 'JSS 1')
  assert.equal(config.values.arms, 'JSS1 A')
  assert.equal(config.values.subjects, 'ENGLISH LANGUAGE, MATHEMATICS')
  assert.equal(config.meta, 'CUN/Adm26/08/491 · JSS 1 · JSS1 A')
})

test('the login is read beside the record, not typed into', () => {
  assert.deepEqual(teacherProfile(PROFILE).account, [
    { label: 'Signs in with', value: 'teacher1@netpro.africa' },
    { label: 'Staff number', value: 'CUN/Adm26/08/491' },
    { label: 'Sign-in', value: 'Enabled' },
    { label: 'On record since', value: '26 Aug 2026' },
  ])
})

test('only the phone and the address can be typed into', () => {
  const editable = teacherProfile(PROFILE)
    .fields.filter((field) => !field.locked)
    .map((field) => field.key)
  assert.deepEqual(editable, ['phone', 'address'])
})

test('a teacher with no arm and no subject is told so in words', () => {
  const config = teacherProfile({
    ...PROFILE,
    teacher: { ...PROFILE.teacher, subjects: [] },
    class_arms: [],
  })
  assert.match(config.values.arms, /Not a class teacher/)
  assert.match(config.values.subjects, /None yet/)
  assert.equal(config.meta, 'CUN/Adm26/08/491 · JSS 1')
})

test('a record that did not answer leaves the page to the session', () => {
  const config = teacherProfile()
  assert.equal(config.fromRecord, undefined)
  assert.equal(config.values.fullname, '')
})

test('the save sends the two fields the endpoint takes and nothing else', () => {
  const body = teacherContactBody({
    fullname: 'Somebody Else',
    klass: 'SSS 3',
    phone: ' 08122260140 ',
    address: '10 Wilfred Okereke street',
  })
  assert.deepEqual(body, { phone: '08122260140', address: '10 Wilfred Okereke street' })
})

test('an empty box is left out rather than blanking what the school holds', () => {
  assert.deepEqual(teacherContactBody({ phone: '  ', address: '' }), {
    phone: undefined,
    address: undefined,
  })
})
