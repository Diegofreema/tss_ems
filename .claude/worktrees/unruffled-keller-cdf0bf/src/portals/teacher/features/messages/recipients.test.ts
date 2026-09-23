import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TeacherRoll, TeacherStudent } from '../../../../api/teaching/types.ts'
import {
  allToggled,
  armLabel,
  armOptions,
  matching,
  recipientOf,
  recipientsIn,
  selectionNote,
  toggled,
} from './recipients.ts'

/**
 * The arms `GET /teachers/me/students` answered with for teacher1 and
 * teacher2 on bronze. Between them they hold every naming case the school has:
 * an arm whose name repeats its class with the spaces moved, one that repeats
 * nothing, and one named for nothing but its letter.
 */
const JSS1A = {
  id: 3,
  department_id: 1,
  arm_name: 'JSS1 A',
  department: { id: 1, name: 'JSS 1' },
} as unknown as TeacherRoll['class_arms'][number]

const JSS2A = {
  id: 4,
  department_id: 2,
  arm_name: 'JSS 2 A',
  department: { id: 2, name: 'SSS I' },
} as unknown as TeacherRoll['class_arms'][number]

const BARE_A = {
  id: 11,
  department_id: 6,
  arm_name: 'A',
  department: { id: 6, name: 'SSS I' },
} as unknown as TeacherRoll['class_arms'][number]

const pupil = (over: Partial<TeacherStudent>): TeacherStudent =>
  ({
    id: 10,
    fname: 'Aniegbokas',
    mname: null,
    lname: 'Chukwudi',
    regno: 'MGS/2020535',
    class_arm_id: 3,
    ...over,
  }) as unknown as TeacherStudent

const roll = (
  students: TeacherStudent[],
  arms: TeacherRoll['class_arms'],
): TeacherRoll =>
  ({ items: students, class_arms: arms }) as unknown as TeacherRoll

test('an arm does not say its class twice, and never says none at all', () => {
  // "JSS1 A" already carries "JSS 1" — the spaces are all that hide it.
  assert.equal(armLabel(JSS1A), 'JSS1 A')
  // "A" on its own names nothing without the class in front of it.
  assert.equal(armLabel(BARE_A), 'SSS I · A')
  // The school filed an arm called "JSS 2 A" under the class "SSS I". That is
  // the school's own doing and both halves are shown rather than one guessed.
  assert.equal(armLabel(JSS2A), 'SSS I · JSS 2 A')
})

test('an arm with nobody in it is still on the picker', () => {
  const options = armOptions(roll([pupil({ class_arm_id: 4 })], [JSS2A, BARE_A]))
  assert.deepEqual(options, [
    { value: '4', label: 'SSS I · JSS 2 A', count: 1 },
    // Teacher2 takes this arm and no pupil sits in it. Dropping it would tell
    // them they do not take it.
    { value: '11', label: 'SSS I · A', count: 0 },
  ])
})

test('a pupil is named whole, with the admission number beside it', () => {
  assert.deepEqual(recipientOf(pupil({ mname: 'OZOMGBO' })), {
    id: 10,
    name: 'Aniegbokas OZOMGBO Chukwudi',
    adm: 'MGS/2020535',
    armId: 3,
  })
})

test('a pupil the school gave no admission number is still told apart', () => {
  const anonymous = recipientOf(pupil({ id: 22, regno: null, fname: '', lname: '' }))
  assert.equal(anonymous.name, 'Pupil 22')
  assert.equal(anonymous.adm, 'Pupil 22')
})

test('the roll is cut to the arm that was picked', () => {
  const both = roll(
    [pupil({ id: 10, class_arm_id: 3 }), pupil({ id: 4, class_arm_id: 4 })],
    [JSS1A, JSS2A],
  )
  assert.deepEqual(recipientsIn(both, 3).map((one) => one.id), [10])
  assert.deepEqual(recipientsIn(both, 4).map((one) => one.id), [4])
  assert.deepEqual(recipientsIn(both, 11), [])
})

test('the search box answers to the name and to the admission number', () => {
  const pupils = [
    recipientOf(pupil({ id: 10, fname: 'Aniegbokas', lname: 'Chukwudi' })),
    recipientOf(pupil({ id: 4, fname: 'UDOYE', lname: 'OKIGBO', regno: 'CUN/2026/4' })),
  ]
  assert.deepEqual(matching(pupils, 'udo').map((one) => one.id), [4])
  assert.deepEqual(matching(pupils, 'cun/2026').map((one) => one.id), [4])
  // Case is not the teacher's problem: the school stores one name shouted.
  assert.deepEqual(matching(pupils, 'CHUKWUDI').map((one) => one.id), [10])
  assert.deepEqual(matching(pupils, '  ').map((one) => one.id), [10, 4])
})

test('a pupil is picked up and put down again', () => {
  assert.deepEqual(toggled([], 4), [4])
  assert.deepEqual(toggled([4, 10], 4), [10])
})

test('select-all takes the pupils on screen and leaves the others alone', () => {
  const shown = [recipientOf(pupil({ id: 10 })), recipientOf(pupil({ id: 11 }))]
  // A pupil chosen in another arm survives select-all here.
  assert.deepEqual(allToggled([4], shown), [4, 10, 11])
  // Everyone shown is already in, so the same press takes them out — and
  // still leaves the pupil from the other arm.
  assert.deepEqual(allToggled([4, 10, 11], shown), [4])
  // Half in: the press completes the set rather than clearing it.
  assert.deepEqual(allToggled([10], shown), [10, 11])
})

test('the note counts the whole selection, not just this arm', () => {
  const shown = [recipientOf(pupil({ id: 10 })), recipientOf(pupil({ id: 11 }))]
  assert.equal(selectionNote([10], shown), '1 selected · 2 shown')
  // Someone chosen in an arm that is not on screen has to be accounted for,
  // or the count reads as a bug.
  assert.equal(selectionNote([10, 4], shown), '2 selected · 1 of them here · 2 shown')
  assert.equal(selectionNote([], shown), '0 selected · 2 shown')
})
