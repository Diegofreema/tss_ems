import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ClassArm } from '../../../api/class-arms/types.ts'
import type { Subject } from '../../../api/subjects/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import {
  armDeleteBody,
  armStudentRow,
  armRow,
  subjectClassRow,
  subjectDeleteBody,
  subjectRow,
  subjectStatus,
  subjectTeacherRow,
  titleCase,
  withdrawAction,
} from './academics-row.ts'

/** Arm 4 as `GET /class-arms?limit=3` sends it — names already expanded. */
const listed: ClassArm = {
  id: 4,
  arm_name: 'JSS 2 A',
  arm_description: 'JSS 2 A SILVER',
  status: 'active',
  department_id: 2,
  department: 'SSS I',
  class_teacher_id: 7,
  class_teacher: 'NETPRO2 TEACHER2',
  students: 2,
}

/** The same arm from `GET /class-arms/4`, where `students` is null instead. */
const detailed: ClassArm = {
  ...listed,
  students: null,
  dependencies: { students: 2, results: 1, attendances: 0 },
}

/** Subject 1 as `GET /subjects/1` sends it. */
const subject: Subject = {
  id: 1,
  name: 'ENGLISH LANGUAGE',
  subjectcode: 'EL',
  creditload: 0,
  status: 1,
  is_active: true,
  department_id: 1,
  department: 'JSS 1',
  semester_id: 0,
  semester: null,
  level_id: 0,
  level: null,
  classes: [
    { id: 1, name: 'JSS 1', is_home: true },
    { id: 6, name: 'SSS I', is_home: false },
  ],
  teachers: [{ id: 2, name: 'Teacher u 1 New Teacher' }],
  dependencies: { results: 0, coursematerials: 0, topics: 0, setassignments: 1 },
}

test('an arm reads the class and teacher expanded beside their ids', () => {
  const row = armRow(listed)
  assert.equal(row.arm, 'JSS 2 A')
  assert.equal(row.klass, 'SSS I')
  assert.equal(row.teacher, 'NETPRO2 TEACHER2')
})

test('an arm with no form teacher reads blank, not "null"', () => {
  const row = armRow({ ...listed, class_teacher: null, class_teacher_id: null })
  assert.equal(row.teacher, BLANK)
  assert.equal(row.class_teacher_id, '')
})

test('the roll is read from whichever of the two shapes carries it', () => {
  // The list sends the count on the arm; the detail sends null there and puts
  // it in `dependencies`. Both have to read 2.
  assert.equal(armRow(listed).roll, '2')
  assert.equal(armRow(detailed).roll, '2')
})

test('an empty arm reads zero, and an unknown roll reads blank', () => {
  assert.equal(armRow({ ...listed, students: 0 }).roll, '0')
  assert.equal(armRow({ ...listed, students: undefined }).roll, BLANK)
})

test('statuses are shown as words, not as the API spells them', () => {
  assert.equal(titleCase('active'), 'Active')
  assert.equal(armRow({ ...listed, status: 'archived' }).status, 'Archived')
  // A value matching none of the options would open the select on nothing.
  assert.equal(armRow({ ...listed, status: 'archived' }).armstatus, 'Archived')
})

test('the arm delete confirm names what would be stranded', () => {
  const body = armDeleteBody(armRow(detailed))
  assert.match(body, /2 students/)
  assert.match(body, /1 result\b/)
  // Zero attendances are not worth naming.
  assert.doesNotMatch(body, /attendance record/)
  assert.match(body, /archive it instead/i)
})

test('an arm nothing points at says so rather than listing nothing', () => {
  assert.match(armDeleteBody(armRow({ ...listed, students: 0 })), /strands nothing/)
})

test('a subject reads its home class off the row it came with', () => {
  const row = subjectRow(subject)
  assert.equal(row.klass, 'JSS 1')
  assert.equal(row.taught, 'JSS 1, SSS I')
  assert.equal(row.staff, 'Teacher u 1 New Teacher')
})

test('the list expands neither classes nor teachers, so both read blank', () => {
  // Blank, never "0" — the register has not been told, which is a different
  // thing from having been told none.
  const listedSubject = { ...subject, classes: undefined, teachers: undefined }
  assert.equal(subjectRow(listedSubject).staff, BLANK)
  assert.equal(subjectRow(listedSubject).taught, BLANK)
})

test('the edit form ticks the teachers the detail expanded', () => {
  assert.equal(subjectRow(subject).teacher_ids, '2')
  // A row off the list knows of none, which is why edit refetches the detail.
  assert.equal(subjectRow({ ...subject, teachers: undefined }).teacher_ids, '')
})

test('the API spells a subject status as a number', () => {
  assert.equal(subjectStatus(1), 'Active')
  assert.equal(subjectStatus(0), 'Inactive')
  assert.equal(subjectRow({ ...subject, status: 0 }).status, 'Inactive')
})

test('the classes a subject is taught to ride along for the flow to preselect', () => {
  assert.equal(subjectRow(subject).classIds, '1,6')
})

test('withdrawing is asked about; offering again is not', () => {
  const offered = subjectRow(subject)
  assert.equal(withdrawAction.label(offered), 'Withdraw')
  assert.ok(withdrawAction.confirm(offered))
  assert.match(withdrawAction.done(offered), /withdrawn/)

  const withdrawn = subjectRow({ ...subject, status: 0 })
  assert.equal(withdrawAction.label(withdrawn), 'Offer again')
  assert.equal(withdrawAction.confirm(withdrawn), undefined)
})

test('the subject delete confirm names what it carries', () => {
  const body = subjectDeleteBody(subjectRow(subject))
  assert.match(body, /1 assignment/)
  assert.doesNotMatch(body, /result/)
  assert.match(body, /withdraw it instead/i)
})

test('the home class is marked apart from the ones it is also taught to', () => {
  assert.equal(subjectClassRow({ id: 1, name: 'JSS 1', is_home: true }).role, 'Home class')
  assert.equal(subjectClassRow({ id: 6, name: 'SSS I', is_home: false }).role, 'Also taught')
})

test('a teacher row reads the one joined name the API sends', () => {
  assert.equal(subjectTeacherRow({ id: 2, name: 'Teacher u 1 New Teacher' }).name, 'Teacher u 1 New Teacher')
})

test('a student on the arm tab reads their number and status', () => {
  const student = {
    id: 4, fname: 'UDOYE', lname: 'OKIGBO', mname: null,
    regno: 'CUN/2026/4', application_no: null,
    studentstatus: null, status: 'Admitted',
  } as never
  const row = armStudentRow(student, true)
  assert.equal(row.name, 'UDOYE OKIGBO')
  assert.equal(row.adm, 'CUN/2026/4')
  assert.equal(row.status, 'Admitted')
  assert.equal(row.placed, 'In this arm')
})

test('a student the arm could still take is not counted as being in it', () => {
  const waiting = {
    id: 11, fname: 'Tolu', lname: 'Ayo', mname: null,
    regno: null, application_no: 'APP/0091',
    studentstatus: null, status: 'Admitted',
  } as never
  const row = armStudentRow(waiting, false)
  assert.equal(row.placed, 'Not placed')
  // No reg number yet, so the application number stands in for one.
  assert.equal(row.adm, 'APP/0091')
})
