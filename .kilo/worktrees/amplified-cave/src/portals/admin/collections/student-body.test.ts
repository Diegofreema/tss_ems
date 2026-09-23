import assert from 'node:assert/strict'
import { test } from 'node:test'
import { studentBody } from './student-body.ts'

const filled = {
  fname: 'New',
  lname: 'Student',
  mname: 'middle name',
  dob: new Date(2012, 0, 1),
  email: 'newR@school.ng',
  gender: 'Male',
  department_id: '1',
  address: 'Owerri',
  phone: '',
  class_arm_id: '4',
  sparent_id: '2',
  religion: 'traditionalist',
  // The form holds the ISO code for a country and the school's own id for a
  // state, which is what a live student's record reads back as: Imo is 2663.
  country: 'NG',
  state: '2663',
  previousschool: 'Holy Ghost Primary School, Enugu',
}

test('the form goes out exactly as the endpoint asks for it', () => {
  assert.deepEqual(studentBody(filled, 1), {
    fname: 'New',
    lname: 'Student',
    mname: 'middle name',
    dob: '2012-01-01',
    email: 'newR@school.ng',
    gender: 'Male',
    department_id: 1,
    session_id: 1,
    address: 'Owerri',
    phone: undefined,
    class_arm_id: '4',
    sparent_id: '2',
    religion: 'traditionalist',
    previousschool: 'Holy Ghost Primary School, Enugu',
    country_id: 160,
    state_id: 2663,
  })
})

test('the country is looked up in the school\u2019s own table, not the package\u2019s', () => {
  // `country-state-city` puts Nigeria 159th and this server holds 160.
  assert.equal(studentBody(filled, 1).country_id, 160)
  // A country the school has no number for is stored without one rather than
  // filed under somebody else's.
  assert.equal(studentBody({ ...filled, country: 'GH' }, 1).country_id, undefined)
  assert.equal(studentBody({ ...filled, state: '' }, 1).state_id, undefined)
})

test('the class goes as a number and the arm as the string the select holds', () => {
  const body = studentBody(filled, 1)
  assert.equal(typeof body.department_id, 'number')
  assert.equal(typeof body.class_arm_id, 'string')
})

test('a date is written the way the API reads it, whatever the clock says', () => {
  // Late in the evening, an ISO conversion through UTC would lose a day.
  const evening = { ...filled, dob: new Date(2012, 0, 1, 23, 30) }
  assert.equal(studentBody(evening, 1).dob, '2012-01-01')
})

test('a field left empty is left out, so editing one section clears nothing', () => {
  const sparse = { fname: 'New', lname: 'Student', department_id: '1' }
  const body = studentBody(sparse, 1)
  assert.equal(body.address, undefined)
  assert.equal(body.class_arm_id, undefined)
  assert.equal(body.sparent_id, undefined)
  assert.equal(body.dob, undefined)
  assert.equal(body.country_id, undefined)
  assert.equal(body.state_id, undefined)
})

test('a class nobody picked is not sent as a zero', () => {
  assert.equal(studentBody({ fname: 'A', lname: 'B', department_id: '' }).department_id, undefined)
})

test('the body says nothing about admission or enrolment', () => {
  // Whoever is creating the record decides that, and an edit must not quietly
  // re-admit a student somebody suspended.
  const body = studentBody({ ...filled, admission: 'Applied', studentstatus: 'Suspended' }, 1)
  assert.equal('status' in body, false)
  assert.equal('studentstatus' in body, false)
})

test('a student with no middle name is enrolled without one', () => {
  // Nobody has to answer this box, so every way of leaving it alone reads the
  // same: the record is stored with the column empty, not refused.
  for (const empty of [undefined, '', '   ']) {
    assert.equal(studentBody({ ...filled, mname: empty }, 1).mname, null)
  }
})

test('clearing the middle name on an edit actually clears it', () => {
  // Dropped rather than sent, the key never reaches the endpoint and the name
  // the office just deleted is still on the record when the page reloads.
  const body = studentBody({ ...filled, mname: '' })
  assert.equal('mname' in body, true)
  assert.equal(body.mname, null)
})

test('a student with no school before this one is enrolled without one', () => {
  // Optional, and on screen on every edit, so an empty box is an answer: null
  // clears what is there rather than leaving the old school on the record.
  for (const empty of [undefined, '', '   ']) {
    assert.equal(studentBody({ ...filled, previousschool: empty }, 1).previousschool, null)
  }
  const cleared = studentBody({ ...filled, previousschool: '' })
  assert.equal('previousschool' in cleared, true)
})
