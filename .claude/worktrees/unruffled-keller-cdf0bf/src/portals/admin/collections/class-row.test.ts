import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Department } from '../../../api/departments/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import {
  census,
  classArmRow,
  classBody,
  classCounts,
  classDeleteBody,
  classRow,
  classSubjectRow,
} from './class-row.ts'

/** JSS 1 exactly as `GET /departments/1` answers on bronze. */
const JSS1: Department = {
  id: 1,
  name: 'JSS 1',
  deptcode: 'JSS 1',
  faculty_id: 0,
  faculty: null,
  iscdl: 'No',
  maxunit: null,
  subjects: [
    { id: 1, name: 'ENGLISH LANGUAGE', subjectcode: 'EL', creditload: 0, status: 1 },
    { id: 7, name: 'IGBO LANGUAGE', subjectcode: 'IL', creditload: 0, status: 1 },
    { id: 10, name: 'INTEGRATED SCIENCE', subjectcode: 'IS', creditload: 0, status: 1 },
  ],
  class_arms: [
    { id: 3, arm_name: 'JSS1 A', status: 'active', students: 4 },
    { id: 10, arm_name: 'B', status: 'active', students: 0 },
  ],
  fees: [
    { id: 1, name: 'TUITION FEE' },
    { id: 6, name: 'Meidcal FEE' },
  ],
  levels: [],
  semesters: [],
  programmes: [],
  dependencies: { students: 6, subjects: 3, class_arms: 2, results: 0, teachers: 2 },
}

test('counts come off dependencies, which see pupils no arm holds', () => {
  const counts = classCounts(JSS1)
  // The two arms hold four pupils between them; the class has six.
  assert.deepEqual(counts, {
    arms: 2,
    pupils: 6,
    subjects: 3,
    armNames: ['JSS1 A', 'B'],
  })
})

test('a class without dependencies falls back to the lists it expanded', () => {
  const { dependencies: _dropped, ...bare } = JSS1
  assert.deepEqual(classCounts(bare), {
    arms: 2,
    pupils: 0,
    subjects: 3,
    armNames: ['JSS1 A', 'B'],
  })
})

test('the census totals every class and keys each by id', () => {
  const other: Department = { ...JSS1, id: 5, name: 'JSS III', dependencies: { students: 1, class_arms: 0, subjects: 2 } }
  const { counts, totals } = census([JSS1, other])
  assert.equal(totals.classes, 2)
  assert.equal(totals.pupils, 7)
  assert.equal(totals.arms, 2)
  assert.equal(totals.subjects, 5)
  assert.equal(counts.get('5')?.pupils, 1)
})

test('a row reads its counts, and reads blank rather than zero without them', () => {
  const withCounts = classRow(JSS1, classCounts(JSS1))
  assert.equal(withCounts.name, 'JSS 1')
  assert.equal(withCounts.pupils, '6')
  assert.equal(withCounts.fees, 'TUITION FEE, Meidcal FEE')

  const bare = classRow(JSS1)
  assert.equal(bare.pupils, BLANK)
  assert.equal(bare.arms, BLANK)
})

test('the arms read as the names of the arms, not as how many there are', () => {
  const row = classRow(JSS1, classCounts(JSS1))
  assert.equal(row.arms, 'JSS1 A, B')
  // The warning still needs the number, so the row carries it uncolumned.
  assert.equal(row.armCount, '2')
})

test('a class with no arms reads blank rather than an empty list', () => {
  const alone: Department = { ...JSS1, class_arms: [], dependencies: { class_arms: 0 } }
  assert.equal(classRow(alone, classCounts(alone)).arms, BLANK)
})

test('the body is the name and the two id arrays, as the endpoint wants them', () => {
  const body = classBody({
    name: '  SSS I ',
    fee_ids: ['1'],
    subject_ids: [],
  })
  assert.deepEqual(body, { name: 'SSS I', fees: [1], subjects: [] })
})

test('the ids go as numbers, and rubbish in the array is dropped', () => {
  const body = classBody({ name: 'JSS 2', fee_ids: ['1', '6', '', 'x', '0'], subject_ids: ['10'] })
  assert.deepEqual(body.fees, [1, 6])
  assert.deepEqual(body.subjects, [10])
})

test('an empty set is sent, not left out', () => {
  // These keys replace the whole set, so leaving `fees` out of an edit that
  // unticked the last one would keep on charging it.
  const body = classBody({ name: 'JSS 2' })
  assert.deepEqual(body, { name: 'JSS 2', fees: [], subjects: [] })
  assert.ok('fees' in body && 'subjects' in body)
})

test('the code is not sent — the endpoint fills it from the name', () => {
  assert.equal('deptcode' in classBody({ name: 'JSS 2', deptcode: 'J2' }), false)
})

test('the edit form prefills from the ids the detail expanded', () => {
  const row = classRow(JSS1, classCounts(JSS1))
  assert.equal(row.fee_ids, '1,6')
  assert.equal(row.subject_ids, '1,7,10')
  // Round trip: what the record hands the form is what the form hands back.
  const reopened = classBody({
    name: row.name,
    fee_ids: row.fee_ids.split(',').filter(Boolean),
    subject_ids: row.subject_ids.split(',').filter(Boolean),
  })
  assert.deepEqual(reopened, { name: 'JSS 1', fees: [1, 6], subjects: [1, 7, 10] })
})

test('a class the list built carries no ids, which is why edit refetches', () => {
  // The list endpoint expands neither, so a row from it would tick nothing —
  // and saving that would clear the class. The edit form loads `record`.
  const { fees: _f, subjects: _s, ...listed } = JSS1
  assert.equal(classRow(listed).fee_ids, '')
  assert.equal(classRow(listed).subject_ids, '')
})

test('an arm row reads the teacher and roll the class detail gives it', () => {
  const row = classArmRow({
    id: 3,
    arm_name: 'JSS1 A',
    description: 'JSS 1A GOLDEN',
    status: 'active',
    class_teacher: 'Teacher u 1 New Teacher',
    students: 4,
  })
  assert.equal(row.arm, 'JSS1 A')
  assert.equal(row.teacher, 'Teacher u 1 New Teacher')
  assert.equal(row.roll, '4')
  assert.equal(row.status, 'Active')
})

test('an arm with nobody on it reads blank for the teacher, not "null"', () => {
  const row = classArmRow({ id: 10, arm_name: 'B', status: 'active', class_teacher: null, students: 0 })
  assert.equal(row.teacher, BLANK)
  assert.equal(row.roll, '0')
})

test('a subject row spells the numeric status as the register does', () => {
  const offered = classSubjectRow({ id: 1, name: 'ENGLISH LANGUAGE', subjectcode: 'EL', creditload: 0, status: 1 })
  assert.equal(offered.status, 'Active')
  assert.equal(classSubjectRow({ id: 2, name: 'X', subjectcode: null, creditload: null, status: 0 }).status, 'Inactive')
})

test('the delete confirm names what is in the way', () => {
  const body = classDeleteBody(classRow(JSS1, classCounts(JSS1)))
  assert.match(body, /6 pupils/)
  assert.match(body, /2 arms/)
  assert.match(body, /3 subjects/)
})

test('a single dependency is named in the singular', () => {
  const body = classDeleteBody({ id: '2', pupils: '1', armCount: '0', subjectCount: '0' })
  assert.match(body, /1 pupil\b/)
  assert.doesNotMatch(body, /arms/)
})

test('an empty class says so rather than listing nothing', () => {
  const body = classDeleteBody({ id: '2', pupils: '0', armCount: '0', subjectCount: '0' })
  assert.match(body, /Nothing belongs to this class/)
})
