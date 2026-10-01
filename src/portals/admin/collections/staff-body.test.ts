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
  // No country: the form stopped asking, because the only states the school
  // can number are Nigeria's and the country follows from the state.
  state: '2647',
  department_id: '1',
  qualification: 'BSc',
  profile: 'About this teacher',
  class_arm_id: '4',
  dob: new Date(2004, 9, 11),
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
    class_arm_id: '4',
    dob: '2004-10-11',
  })
})

test('the country comes off the state, from the school\u2019s own table', () => {
  // Not written as a number here: it is looked up by the same ISO code the
  // state ids are generated for, so the two can never name different places.
  assert.equal(teacherBody(TEACHING_FORM).country_id, 160)
})

test('no state means no country either, rather than a country on its own', () => {
  // An address saying "Nigeria" and nothing else says less than one saying
  // neither, and it would be this form inventing a fact nobody entered.
  const body = teacherBody({ ...TEACHING_FORM, state: '' })
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
      middlename: null,
      gender: 'Male',
      department_id: 1,
      phone: '08000000000',
      address: 'Address',
      dob: undefined,
    },
  )
})

test('the birthday goes as the date the office picked, not as the browser read it', () => {
  // The calendar hands back a Date at local midnight. Read through
  // `toISOString` a January birthday west of Greenwich becomes 31 December of
  // the year before, so the parts are taken off the calendar instead.
  const body = adminBody({ dob: new Date(2001, 0, 1) })
  assert.equal(body.dob, '2001-01-01')
})

test('a form with no birthday drops the key rather than clearing one on file', () => {
  // The endpoint is a partial write: an empty string here would blank a
  // birthday the office had already entered elsewhere.
  assert.equal(adminBody({}).dob, undefined)
  assert.equal(adminBody({ dob: '' }).dob, undefined)
  assert.equal(adminBody({ dob: new Date('nonsense') }).dob, undefined)
})

test('an edit sends the birthday too', () => {
  // It rides on `adminBody`, so this pins the two together rather than the
  // update growing its own list to fall behind with.
  assert.equal(adminUpdate({ dob: new Date(1990, 11, 25) }).dob, '1990-12-25')
})

test('an update sends everything the create does', () => {
  assert.equal(teacherUpdate(TEACHING_FORM).username, 'newteachingstaff@school.ng')
  assert.equal(teacherUpdate(TEACHING_FORM).country_id, 160)
  assert.equal(adminUpdate(TEACHING_FORM).username, 'newteachingstaff@school.ng')
})

test('a staff member with no middle name is filed without one', () => {
  // The only part of a name nobody has to have, so an empty box is an answer
  // and not a refusal to answer: it goes as null on both endpoints.
  for (const empty of [undefined, '', '   ']) {
    assert.equal(teacherBody({ ...values, middlename: empty }).middlename, null)
    assert.equal(adminBody({ ...values, middlename: empty }).middlename, null)
  }
})

test('clearing the middle name on an edit actually clears it', () => {
  // Dropped, the key never reaches either endpoint and the name the office
  // just deleted is still on the record when the page reloads.
  for (const body of [teacherUpdate({ ...values, middlename: '' }), adminUpdate({ ...values, middlename: '' })]) {
    assert.equal('middlename' in body, true)
    assert.equal(body.middlename, null)
  }
})

test('a subject teacher who takes no arm is saved without one', () => {
  // The arm is the one teaching field nobody has to answer: dropped when empty
  // rather than sent, so an edit that touched another field leaves whatever arm
  // the teacher already holds exactly where it was.
  for (const empty of [undefined, '', '   ']) {
    // Undefined, so it drops off the moment the body is serialised — the same
    // way qualification and address do when the office leaves them blank.
    assert.equal(teacherBody({ ...TEACHING_FORM, class_arm_id: empty }).class_arm_id, undefined)
  }
  assert.equal(teacherUpdate({ ...TEACHING_FORM, class_arm_id: '9' }).class_arm_id, '9')
})

test('an arm outside the chosen class is not sent, and so is not taken away', () => {
  /*
   * This one is reachable without anybody touching the field. The arm feed is
   * narrowed by the class now, and this school has teachers whose arm belongs
   * to another class — one is filed under JSS III and is class teacher of JSS
   * 1B — so their edit form opens with the arm box empty, because that arm is
   * not among the ones offered. Empty must mean "leave it alone" and not "no
   * arm", or saving a phone number would unseat them.
   */
  const openedEmpty = { ...TEACHING_FORM, department_id: '5', class_arm_id: '' }
  assert.equal('class_arm_id' in JSON.parse(JSON.stringify(teacherBody(openedEmpty))), false)
  assert.equal('class_arm_id' in JSON.parse(JSON.stringify(teacherUpdate(openedEmpty))), false)
})

test('a teacher birthday goes onto the login as ISO, and drops when empty', () => {
  // The teaching record keeps no birthday; the endpoint files it on the login.
  assert.equal(teacherBody({ ...TEACHING_FORM, dob: new Date(1990, 11, 25) }).dob, '1990-12-25')
  assert.equal(teacherUpdate({ ...TEACHING_FORM, dob: new Date(1990, 11, 25) }).dob, '1990-12-25')
  for (const empty of [undefined, '', 'not a date']) {
    assert.equal(teacherBody({ ...TEACHING_FORM, dob: empty }).dob, undefined)
  }
})

test('a teacher’s passport photograph goes out as `passports`, and nowhere else', () => {
  const photo = new File(['x'], 'nnaji.jpg', { type: 'image/jpeg' })
  assert.equal(teacherBody({ ...values, passports: photo }).passports, photo)
  assert.equal('passports' in teacherBody(values), false)
  assert.equal('passports' in adminBody({ ...values, passports: photo }), false)
})
