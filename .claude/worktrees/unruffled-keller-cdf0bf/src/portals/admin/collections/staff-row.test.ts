import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Teacher } from '../../../api/teachers/types.ts'
import type { Admin } from '../../../api/users/types.ts'
import {
  adminDeleteBody,
  adminRow,
  staffDeleteBody,
  parseStaffKey,
  privilegeRow,
  staffKey,
  staffTarget,
  teacherRow,
  teacherSubjectRow,
} from './staff-row.ts'

const teacher: Teacher = {
  id: 14, user_id: 90, firstname: 'Chukwuma', lastname: 'Nnaji', middlename: 'O',
  gender: 'Male', address: '2 Aba Road', country_id: null, state_id: null,
  phone: '08034412280', profile: null, cv: 'cv-14.pdf', qualification: 'B.Sc Mathematics',
  date_created: '2021-09-15T00:00:00Z', passport: null, department_id: 5,
  staffgrade_id: null, staffdepartment_id: null, isadviser: 'Yes',
}

const admin: Admin = {
  id: 3, user_id: 12, surname: 'Samuel', lastname: 'Idowu', status: 'Active',
  date_created: '2020-01-06T00:00:00Z', adminphoto: null, gender: 'Male',
  department_id: null, phone: '08065551234', address: null, dob: null, profile: null,
}

test('a teacher row names the two populations apart in its id', () => {
  assert.equal(teacherRow(teacher).id, 't-14')
  assert.equal(adminRow(admin).id, 'a-3')
})

test('a teacher row joins the three name parts in order', () => {
  assert.equal(teacherRow(teacher).name, 'Chukwuma O Nnaji')
})

test('a teacher’s status is the login behind the record, not the record', () => {
  // The teaching record has no status column of its own.
  assert.equal(teacherRow(teacher).status, '—')
  assert.equal(teacherRow(TEACHING).status, 'Enabled')
  assert.equal(adminRow(admin).status, 'Active')
})

test('isadviser is read as what it means rather than Yes or No', () => {
  assert.equal(teacherRow(teacher).adviser, 'Takes an arm')
  assert.equal(teacherRow({ ...teacher, isadviser: 'No' }).adviser, 'No arm')
})

test('an office record without an expanded login is still an administrator', () => {
  assert.equal(adminRow(admin).role, 'Administrator')
  const withRole = { ...admin, user: { role: { id: 2, role_name: 'Bursary' } } } as Admin
  assert.equal(adminRow(withRole).role, 'Bursary')
})

test('the admin API calls the first half of the name surname', () => {
  const row = adminRow(admin)
  assert.equal(row.name, 'Samuel Idowu')
  // Held under the form's own spelling — see the prefill test below.
  assert.equal(row.firstname, 'Samuel')
})

test('a key round-trips to the endpoint it came from', () => {
  assert.deepEqual(parseStaffKey(staffKey('admin', 3)), { kind: 'admin', id: '3' })
  assert.deepEqual(parseStaffKey(staffKey('teacher', 14)), { kind: 'teacher', id: '14' })
})

test('a bare id is read as a teacher rather than dropped', () => {
  assert.deepEqual(parseStaffKey('14'), { kind: 'teacher', id: '14' })
})

test('a missing qualification reads blank rather than empty', () => {
  assert.equal(teacherRow({ ...teacher, qualification: null }).qualification, '—')
})

test('a new record goes to the endpoint the form picked', () => {
  assert.equal(staffTarget(undefined, 'Administrators'), 'admin')
  assert.equal(staffTarget(undefined, 'Teacher'), 'teacher')
})

test('a pinned page overrides the form, which does not ask there', () => {
  assert.equal(staffTarget('admin', undefined), 'admin')
  assert.equal(staffTarget('teacher', 'Administrators'), 'teacher')
})

test('an edit follows the record, never the form or the page', () => {
  assert.equal(staffTarget(undefined, 'Administrators', 't-14'), 'teacher')
  assert.equal(staffTarget('teacher', 'Teacher', 'a-3'), 'admin')
})

test('both rows answer the form’s “Kind of record” in its own words', () => {
  // The office row's `role` is the job — "Bursar", "Super Admin" — and the
  // select has no such option, so an edit opened on no kind at all and the
  // form showed the teaching half to an administrator.
  assert.equal(teacherRow(teacher).kind, 'Teacher')
  assert.equal(adminRow(OFFICER).kind, 'Administrators')
})

/** Francis Okorie as `GET /admins` answers on bronze, trimmed to the point. */
const OFFICER: Admin = {
  id: 4,
  user_id: 30,
  surname: 'Okorie',
  lastname: 'Francis',
  status: 'active',
  date_created: '2021-07-26T06:36:48+01:00',
  adminphoto: null,
  gender: 'Male',
  department_id: 1,
  phone: '08037025918',
  address: 'Nekede Imo State',
  dob: '',
  profile: 'ICT Director',
  privileges: [
    { id: 1, name: 'Admission' },
    { id: 7, name: 'Admin' },
  ],
  department: { id: 1, name: 'JSS 1', deptcode: 'JSS 1' },
  user: {
    id: 30,
    username: 'francis.okorie@claretianuniversity.edu.ng',
    role_id: 1,
    userstatus: 'Enabled',
  } as Admin['user'],
}

const ROLES = new Map([
  ['1', 'Admin'],
  ['5', 'Super Admin'],
])

test('the role is named from the lookup, since the list only sends its number', () => {
  // Without it every office record on the register read "Administrator".
  assert.equal(adminRow(OFFICER, ROLES).role, 'Admin')
  assert.equal(adminRow(OFFICER).role, 'Administrator')
  const boss = { ...OFFICER, user: { ...OFFICER.user, role_id: 5 } } as Admin
  assert.equal(adminRow(boss, ROLES).role, 'Super Admin')
})

test('the office record and the sign-in are two different states', () => {
  const row = adminRow(OFFICER, ROLES)
  // The API lower-cases one of them and title-cases the other.
  assert.equal(row.status, 'Active')
  assert.equal(row.account, 'Enabled')
  const off = { ...OFFICER, user: { ...OFFICER.user, userstatus: 'Disabled' } } as Admin
  assert.equal(adminRow(off, ROLES).account, 'Disabled')
})

test('the job and the sign-in address are read for the record panel', () => {
  const row = adminRow(OFFICER, ROLES)
  assert.equal(row.title, 'ICT Director')
  assert.equal(row.username, 'francis.okorie@claretianuniversity.edu.ng')
  assert.equal(row.user_id, '30')
})

test('privileges are named where they were expanded, and blank where not', () => {
  const row = adminRow(OFFICER, ROLES)
  assert.equal(row.privileges, 'Admission, Admin')
  assert.equal(row.privilegeIds, '1,7')
  // The list expands none, so a row off it must not read as "holds nothing".
  const { privileges: _none, ...listed } = OFFICER
  assert.equal(adminRow(listed as Admin, ROLES).privileges, '—')
})

test('a privilege says whether it is held, not merely that it exists', () => {
  const held = new Set(['1', '7'])
  assert.equal(privilegeRow({ id: 1, name: 'Admission' }, held).state, 'Granted')
  assert.equal(privilegeRow({ id: 3, name: 'Result' }, held).state, 'Not granted')
})

test('the first administrator cannot be deleted, and the dialog says why', () => {
  const body = adminDeleteBody({ id: staffKey('admin', 1), name: 'Surname Firstname' })
  assert.match(body, /first administrator/)
  assert.doesNotMatch(body, /permanently/)
})

test('deleting anyone else is named, permanent, and offers the lesser answer', () => {
  const body = adminDeleteBody(adminRow(OFFICER, ROLES))
  assert.match(body, /Okorie Francis/)
  assert.match(body, /permanently/)
  assert.match(body, /disable the sign-in instead/i)
})

test('the mixed register asks about whichever record it is deleting', () => {
  // One dialog, two registers: the key on the row is the only thing saying
  // which of them the record came from.
  assert.match(
    staffDeleteBody(adminRow(OFFICER, ROLES)),
    /disable the sign-in instead/i,
  )
  const teaching = staffDeleteBody(teacherRow(teacher))
  assert.match(teaching, /Chukwuma/)
  assert.match(teaching, /teaching register/)
})

test('the edit form prefills from the keys the form is actually keyed by', () => {
  // The API names the first half of the name `surname`; the form's field is
  // `firstname`. Emitting only the API's spelling left the box empty, and
  // saving an untouched edit would have wiped the name.
  const row = adminRow(OFFICER, ROLES)
  assert.equal(row.firstname, 'Okorie')
  assert.equal(row.lastname, 'Francis')
  assert.equal(row.department_id, '1')
})

/** Teacher 2 as `GET /teachers/2` answers on bronze, trimmed to the point. */
const TEACHING: Teacher = {
  ...teacher,
  id: 2,
  user_id: 491,
  firstname: 'Teacher u 1',
  lastname: 'New Teacher',
  middlename: 'm',
  address: 'Address',
  country_id: 160,
  state_id: 2658,
  profile: 'About this teacher',
  department_id: 1,
  department: { id: 1, name: 'JSS 1', deptcode: 'JSS 1' },
  state: { id: 2658, name: 'Ebonyi', country_id: 160 },
  country: { id: 160, name: 'Nigeria' },
  subjects: [
    {
      id: 1, name: 'ENGLISH LANGUAGE', subjectcode: 'EL', department_id: 1, status: 1,
      department: { id: 1, name: 'JSS 1', deptcode: 'JSS 1' },
    },
    {
      id: 2, name: 'MATHEMATICS', subjectcode: 'MATH', department_id: 2, status: 1,
      department: { id: 2, name: 'SSS I', deptcode: 'SSS I' },
    },
  ],
  user: {
    id: 491,
    username: 'teacher1@netpro.africa',
    role_id: 3,
    userstatus: 'Enabled',
  } as Teacher['user'],
}

test('the detail expands the class and the login the register only numbers', () => {
  const row = teacherRow(TEACHING)
  assert.equal(row.department, 'JSS 1')
  assert.equal(row.username, 'teacher1@netpro.africa')
  assert.equal(row.about, 'About this teacher')
  // A register row knows neither, and must not claim the teacher has none.
  const listed = teacherRow(teacher)
  assert.equal(listed.department, '—')
  assert.equal(listed.subjectCount, '—')
})

test('a teacher with no subjects reads none, not unknown', () => {
  assert.equal(teacherRow(TEACHING).subjectCount, '2')
  assert.equal(teacherRow({ ...TEACHING, subjects: [] }).subjectCount, '0')
})

test('a state belonging to another country is left off the address', () => {
  // Bronze holds one teacher whose state_id points into India while the
  // country reads Nigeria. Printing both makes the address wrong.
  assert.equal(teacherRow(TEACHING).place, 'Address, Ebonyi, Nigeria')
  const mismatched = {
    ...TEACHING,
    state: { id: 1, name: 'Andaman and Nicobar Islands', country_id: 101 },
  }
  assert.equal(teacherRow(mismatched).place, 'Address, Nigeria')
})

test('a subject names the class it is taught in, off the subject itself', () => {
  const carried = TEACHING.subjects ?? []
  const [english, maths] = carried.map(teacherSubjectRow)
  assert.equal(english.name, 'ENGLISH LANGUAGE')
  assert.equal(english.code, 'EL')
  assert.equal(english.klass, 'JSS 1')
  assert.equal(english.state, 'Active')
  // A teacher carries subjects across classes, which is why the column exists.
  assert.equal(maths.klass, 'SSS I')
  assert.equal(teacherSubjectRow({ ...carried[0], status: 0 }).state, 'Inactive')
})

test('the panel counts privileges and the tab names them', () => {
  assert.equal(adminRow(OFFICER, ROLES).privilegeCount, '2')
  const { privileges: _none, ...listed } = OFFICER
  assert.equal(adminRow(listed as Admin, ROLES).privilegeCount, '—')
})

test('an administrator’s address is the record’s, placed by the login', () => {
  // `GET /users/admins/{id}` expands country and state on the login, never on
  // the office record, which is where the street address lives.
  const detailed = {
    ...OFFICER,
    user: {
      ...OFFICER.user,
      country: { id: 160, name: 'Nigeria' },
      state: { id: 2663, name: 'Imo', country_id: 160 },
    },
  } as Admin
  assert.equal(adminRow(detailed, ROLES).place, 'Nekede Imo State, Imo, Nigeria')
  // The list expands neither, so a register row still reads the street alone.
  assert.equal(adminRow(OFFICER, ROLES).place, 'Nekede Imo State')
})

test('the detail names the role itself, so no lookup is needed to read one', () => {
  const detailed = {
    ...OFFICER,
    user: { ...OFFICER.user, role: { id: 1, role_name: 'Super Admin' } },
  } as Admin
  assert.equal(adminRow(detailed).role, 'Super Admin')
})

test('the form writes back the API’s own address, not the line the panel reads', () => {
  // Prefilling the composed line would have saved the country into the street.
  const row = teacherRow(TEACHING)
  assert.equal(row.place, 'Address, Ebonyi, Nigeria')
  assert.equal(row.address, 'Address')
  assert.equal(adminRow(OFFICER, ROLES).address, 'Nekede Imo State')
})

test('an edit opens on the country and state the record holds', () => {
  const row = teacherRow(TEACHING)
  assert.equal(row.country, 'NG')
  assert.equal(row.state, '2658')
  assert.equal(row.profile, 'About this teacher')
  // A country the school numbers but this app has no id for reads blank.
  assert.equal(teacherRow({ ...TEACHING, country_id: 7, state_id: 0 }).country, '')
})
