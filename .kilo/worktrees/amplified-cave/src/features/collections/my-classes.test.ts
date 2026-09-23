import assert from 'node:assert/strict'
import { test } from 'node:test'
import { myClasses, type PlacedArm, type PlacedSubject } from './my-classes.ts'

const SSS3 = { id: 83, name: 'SSS 3', deptcode: 'SSS 3' }
const JSS1 = { id: 1, name: 'JSS 1', deptcode: 'JSS1' }

/**
 * Teacher 135 on bronze, read 2026-09-16: Agriculture and Home Economics, both
 * `department_id` 83 with SSS 3 expanded beside them. A third subject in
 * another class is added here, which is the case the narrowing is for.
 */
const SUBJECTS = [
  { id: 131, name: 'AGRICULTURE', department_id: 83, department: SSS3 },
  { id: 134, name: 'HOME ECONOMICS', department_id: 83, department: SSS3 },
  { id: 1, name: 'ENGLISH LANGUAGE', department_id: 1, department: JSS1 },
] as unknown as PlacedSubject[]

const ARMS = [
  { id: 9, arm_name: 'JSS III A', department: { id: 5, name: 'JSS III', deptcode: 'JSS3' } },
] as unknown as PlacedArm[]

test('with no subject chosen, every class the teacher reaches is offered', () => {
  assert.deepEqual(
    myClasses(SUBJECTS, ARMS).map((one) => one.name),
    ['SSS 3', 'JSS 1', 'JSS III'],
  )
})

test('a chosen subject narrows the list to the one class that sits it', () => {
  // The whole request: Home Economics is only done by SSS 3, so SSS 3 is the
  // only class on offer.
  assert.deepEqual(myClasses(SUBJECTS, ARMS, '134'), [
    { id: 83, name: 'SSS 3', code: 'SSS 3' },
  ])
  assert.deepEqual(myClasses(SUBJECTS, ARMS, '1'), [
    { id: 1, name: 'JSS 1', code: 'JSS1' },
  ])
})

test('a class is offered once however many subjects the teacher takes in it', () => {
  // Agriculture and Home Economics are both SSS 3; the unnarrowed list must
  // not offer it twice.
  assert.equal(myClasses(SUBJECTS, ARMS).filter((one) => one.id === 83).length, 1)
})

test('an arm brings its class even where no subject of theirs is in it', () => {
  assert.deepEqual(
    myClasses([], ARMS).map((one) => one.name),
    ['JSS III'],
  )
})

test('a subject the device does not hold narrows nothing', () => {
  // An empty required dropdown is a form nobody can finish. The list is
  // offered whole and the endpoint gets to refuse a wrong pairing.
  assert.equal(myClasses(SUBJECTS, ARMS, '9999').length, 3)
})

test('a subject sent without its class narrows nothing either', () => {
  const loose = [{ id: 7, name: 'IGBO', department_id: 1 }] as unknown as PlacedSubject[]
  assert.deepEqual(
    myClasses([...loose, ...SUBJECTS], ARMS, '7').map((one) => one.name),
    ['SSS 3', 'JSS 1', 'JSS III'],
  )
})

test('the code is kept so two classes of the same name can be told apart', () => {
  assert.deepEqual(myClasses(SUBJECTS, ARMS, '131')[0], {
    id: 83,
    name: 'SSS 3',
    code: 'SSS 3',
  })
})
