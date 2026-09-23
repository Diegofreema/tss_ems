import assert from 'node:assert/strict'
import { test } from 'node:test'
import type {
  EClass,
  TeacherResult,
  TeacherStudent,
  TeacherSubject,
} from '../../../api/teaching/types.ts'
import {
  eclassRow,
  markRow,
  mySubjectRow,
  pupilRow,
  roomOf,
  scoreRow,
  subjectNames,
  topicRow,
} from './teaching-row.ts'

/** Verbatim from GET /teachers/me/subjects. */
const SUBJECT = {
  id: 1,
  name: 'ENGLISH LANGUAGE',
  subjectcode: 'EL',
  department_id: 1,
  status: 1,
  _joinData: {
    id: 1,
    teacher_id: 2,
    subject_id: 1,
    created_date: '2026-08-26T12:43:05+01:00',
  },
  department: { id: 1, name: 'JSS 1', deptcode: 'JSS 1' },
} as unknown as TeacherSubject

/** Verbatim from GET /teachers/me/students. */
const PUPIL = {
  id: 10,
  fname: 'Aniegbokas',
  lname: 'Chukwudi',
  mname: null,
  dob: '10/11/1986',
  joindate: '2026-08-27T08:15:52+01:00',
  email: 'chukd5@outlook.com',
  phone: '90889988765',
  address: 'Heartland Estate Owerri',
  fathersname: '',
  fatherphone: '',
  regno: 'MGS/2020535',
  status: 'Admitted',
  studentstatus: null,
  gender: 'Male',
  class_arm_id: 3,
  user: { id: 501, username: 'chukd5@outlook.com' },
  class_arm: { id: 3, arm_name: 'JSS1 A' },
  department: { id: 1, name: 'JSS 1' },
} as unknown as TeacherStudent

/** Verbatim from GET /teachers/me/results. */
const MARK = {
  id: 11,
  student_id: 10,
  regno: 'MGS/2020535',
  subject_id: 1,
  ca: '6',
  score: '62.00',
  total: '68',
  grade: 'B',
  approval_status: 'pending',
} as unknown as TeacherResult

test('a subject reads its code, its class and whether it is still offered', () => {
  const row = mySubjectRow(SUBJECT)
  assert.equal(row.code, 'EL')
  assert.equal(row.name, 'ENGLISH LANGUAGE')
  assert.equal(row.klass, 'JSS 1')
  assert.equal(row.status, 'Active')
  assert.equal(row.added, '26 Aug 2026')
})

test('a withdrawn subject is not read as an active one', () => {
  assert.equal(mySubjectRow({ ...SUBJECT, status: 0 }).status, 'Inactive')
})

test('a pupil reads their admission number, arm and class', () => {
  const row = pupilRow(PUPIL)
  assert.equal(row.adm, 'MGS/2020535')
  assert.equal(row.name, 'Aniegbokas Chukwudi')
  assert.equal(row.arm, 'JSS1 A')
  assert.equal(row.klass, 'JSS 1')
  assert.equal(row.born, '10 Nov 1986')
  assert.equal(row.username, 'chukd5@outlook.com')
})

test('a birthday stored the other way round is still written as a date', () => {
  // A pupil the office enrolled through this app is stored YYYY-MM-DD, and
  // used to reach the panel raw — "2023-04-07" beside every other date in the
  // design's own wording.
  assert.equal(pupilRow({ ...PUPIL, dob: '2023-04-07' }).born, '07 Apr 2023')
})

test('the standing shown is the one the school filled in', () => {
  // Admission is all the roll carries for a pupil the office has not marked.
  assert.equal(pupilRow(PUPIL).status, 'Admitted')
  assert.equal(pupilRow({ ...PUPIL, studentstatus: 'Suspended' }).status, 'Suspended')
})

test('a parent nobody typed onto the record is left blank, not half-joined', () => {
  assert.equal(pupilRow(PUPIL).father, '—')
  assert.equal(
    pupilRow({ ...PUPIL, fathersname: 'Emeka Udo', fatherphone: '08033' }).father,
    'Emeka Udo · 08033',
  )
})

test('a mark is read as a number and named by the subject list', () => {
  const row = scoreRow(MARK, subjectNames([SUBJECT]))
  assert.equal(row.subject, 'ENGLISH LANGUAGE')
  assert.equal(row.ca, '6')
  assert.equal(row.exam, '62')
  assert.equal(row.total, '68')
  assert.equal(row.grade, 'B')
  assert.equal(row.state, 'Pending')
})

test('a mark against a subject not on the list keeps its id rather than vanishing', () => {
  assert.equal(scoreRow({ ...MARK, subject_id: 99 }, subjectNames([SUBJECT])).subject, 'Subject 99')
})

/** Verbatim from GET /teachers/me/eclasses, which keys them `classes`. */
const ECLASS = {
  id: 5,
  meetinglink: 'https://meet.jit.si/EBUSCED6a830d152bede',
  teacher_id: 2,
  datecreated: '2026-08-17T13:31:05+01:00',
} as unknown as EClass

test('a topic is named by the subject the teacher was given', () => {
  const row = topicRow(
    { id: 3, subject_id: 1, title: 'Sets and Venn diagrams', contents: 'Two lessons.' },
    subjectNames([SUBJECT]),
  )
  assert.equal(row.title, 'Sets and Venn diagrams')
  assert.equal(row.subject, 'ENGLISH LANGUAGE')
  assert.equal(row.contents, 'Two lessons.')
  // The edit form prefills the select from the id, not from the name.
  assert.equal(row.subject_id, '1')
})

test('an e-class is named by the room its link ends in', () => {
  const row = eclassRow(ECLASS)
  assert.equal(row.room, 'EBUSCED6a830d152bede')
  assert.equal(row.link, 'https://meet.jit.si/EBUSCED6a830d152bede')
  assert.equal(row.created, '17 Aug 2026, 13:31')
})

test('an e-class with no link still reads as a row', () => {
  assert.equal(eclassRow({ ...ECLASS, meetinglink: null }).room, '—')
  assert.equal(roomOf('https://meet.jit.si/ROOM/'), 'ROOM')
})

/** Verbatim from GET /teachers/me/results, which expands every id beside it. */
const FILED = {
  id: 9,
  student_id: 4,
  regno: 'CUN/2026/4',
  subject_id: 10,
  class_arm_id: 4,
  session_id: 8,
  semester_id: 1,
  ca: '8',
  score: '77.00',
  total: '85',
  grade: 'A',
  remark: null,
  approval_status: 'pending',
  uploaddate: '2026-08-31T07:47:06+01:00',
  first_exam: '18.00',
  second_exam: '17.00',
  third_exam: '42.00',
  session: { id: 8, name: '2024/2025' },
  semester: { id: 1, name: 'First Term' },
  subject: { id: 10, name: 'INTEGRATED SCIENCE', subjectcode: 'IS' },
  department: { id: 1, name: 'JSS 1', deptcode: 'JSS 1' },
  student: { id: 4, fname: 'UDOYE', mname: 'OZOMGBO', lname: 'OKIGBO' },
  user: { id: 1, fname: 'Chukwudi', lname: 'Aniegboka' },
} as unknown as TeacherResult

test('a filed mark reads the pupil, the subject and the class off itself', () => {
  const row = markRow(FILED)
  assert.equal(row.name, 'UDOYE OZOMGBO OKIGBO')
  assert.equal(row.adm, 'CUN/2026/4')
  assert.equal(row.subject, 'INTEGRATED SCIENCE')
  assert.equal(row.klass, 'JSS 1')
  assert.equal(row.term, 'First Term · 2024/2025')
  assert.equal(row.ca, '8')
  assert.equal(row.exam, '77')
  assert.equal(row.total, '85')
  assert.equal(row.grade, 'A')
  assert.equal(row.state, 'Pending')
  assert.equal(row.filed, '31 Aug 2026, 07:47')
  assert.equal(row.by, 'Chukwudi Aniegboka')
})

test('the three exam sittings are what explain an exam mark above 60', () => {
  // 18 + 17 + 42 = the 77 the register shows as the exam.
  assert.equal(markRow(FILED).exams, '18 · 17 · 42')
})

test('a mark typed on the score sheet has no sittings to show', () => {
  const typed = { ...FILED, first_exam: '0.00', second_exam: '0.00', third_exam: '0.00' }
  assert.equal(markRow(typed).exams, '—')
  assert.equal(markRow({ ...FILED, first_exam: null, second_exam: null, third_exam: null }).exams, '—')
})

test('a mark whose subject the endpoint did not expand keeps its id', () => {
  assert.equal(markRow({ ...FILED, subject: null }).subject, 'Subject 10')
})
