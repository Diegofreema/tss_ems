import assert from 'node:assert/strict'
import { test } from 'node:test'
import { adminBody, adminUpdate, teacherBody, teacherUpdate } from './staff-body.ts'

const values = {
  username: 'cnnaji',
  firstname: 'Chukwuma',
  lastname: 'Nnaji',
  middlename: '  ',
  gender: 'Male',
  phone: '08034412280',
  address: '',
  department_id: '5',
  qualification: 'B.Sc Mathematics',
}

test('empty fields are dropped rather than sent blank', () => {
  const body = teacherBody(values)
  assert.equal('middlename' in body && body.middlename, undefined)
  assert.equal(body.address, undefined)
  assert.equal(body.phone, '08034412280')
})

test('a select holding an id sends it as a number', () => {
  assert.equal(teacherBody(values).department_id, 5)
  assert.equal(teacherBody({ ...values, department_id: '' }).department_id, undefined)
  assert.equal(teacherBody({ ...values, department_id: '0' }).department_id, undefined)
})

test('the admin endpoint takes the first name under surname', () => {
  const body = adminBody(values)
  assert.equal(body.surname, 'Chukwuma')
  assert.equal(body.lastname, 'Nnaji')
})

test('both edits carry the email', () => {
  assert.equal(teacherUpdate(values).username, 'cnnaji')
  assert.equal(adminUpdate(values).username, 'cnnaji')
  assert.equal(teacherBody(values).username, 'cnnaji')
})

test('an email left empty is left alone rather than blanked', () => {
  assert.equal('username' in teacherUpdate({ ...values, username: '  ' }), false)
  assert.equal('username' in adminUpdate({ ...values, username: '  ' }), false)
})

test('qualification is a teaching field and does not reach the office record', () => {
  assert.equal(teacherBody(values).qualification, 'B.Sc Mathematics')
  assert.equal('qualification' in adminBody(values), false)
})

/** The staff form as the endpoints' own documentation writes their bodies. */
const TEACHING_FORM = {
  username: 'newteachingstaff@school.ng',
  firstname: 'ADAMA',
  lastname: 'StaffLAST',
  middlename: 'M',
  gender: 'Male',
  address: 'OWERRI IMO STATE',
  phone: '08000000000',
  country: 'NG',
  state: '2647',
  department_id: '1',
  qualification: 'BSc',
  profile: 'About this teacher',
}

test('the teacher body is exactly what POST /teachers documents', () => {
  assert.deepEqual(teacherBody(TEACHING_FORM), {
    username: 'newteachingstaff@school.ng',
    firstname: 'ADAMA',
    lastname: 'StaffLAST',
    middlename: 'M',
    gender: 'Male',
    address: 'OWERRI IMO STATE',
    phone: '08000000000',
    country_id: 160,
    state_id: 2647,
    department_id: 1,
    qualification: 'BSc',
    profile: 'About this teacher',
  })
})

test('a country the school has no id for is left off rather than guessed', () => {
  // The form holds an ISO code; the number belongs to the school's own table,
  // and sending somebody else's numbering would file the teacher elsewhere.
  const body = teacherBody({ ...TEACHING_FORM, country: 'FR', state: '' })
  assert.equal(body.country_id, undefined)
  assert.equal(body.state_id, undefined)
  // Everything else still goes.
  assert.equal(body.firstname, 'ADAMA')
})

test('the admin body is exactly what POST /admins/new-admin documents', () => {
  assert.deepEqual(
    adminBody({
      username: 'newadmin@school.ng',
      firstname: 'Surname',
      lastname: 'Firstname',
      middlename: '',
      gender: 'Male',
      department_id: '1',
      phone: '08000000000',
      address: 'Address',
      // The office endpoint takes none of these, so none may reach it.
      country: 'NG',
      state: '2647',
      qualification: 'BSc',
      profile: 'About',
    }),
    {
      username: 'newadmin@school.ng',
      surname: 'Surname',
      lastname: 'Firstname',
      middlename: undefined,
      gender: 'Male',
      department_id: 1,
      phone: '08000000000',
      address: 'Address',
    },
  )
})

test('an update sends everything the create does', () => {
  assert.equal(teacherUpdate(TEACHING_FORM).username, 'newteachingstaff@school.ng')
  assert.equal(teacherUpdate(TEACHING_FORM).country_id, 160)
  assert.equal(adminUpdate(TEACHING_FORM).username, 'newteachingstaff@school.ng')
})
