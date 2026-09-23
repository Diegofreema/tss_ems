import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TakeRegisterBody } from '../../../../api/attendance/types.ts'
import type { TeacherStudent } from '../../../../api/teaching/types.ts'
import type { DayRegister } from '../../../../db/register-day.ts'
import { WRITE } from '../../../../db/ids.ts'
import type { OpState, OutboxOp } from '../../../../db/outbox.ts'
import { composeDay, queuedMarks, rollFor } from './day.ts'

function op(
  seq: number,
  body: TakeRegisterBody,
  state: OpState = 'queued',
  handler: string = WRITE.takeRegister,
): OutboxOp {
  return {
    id: `op-${seq}`,
    seq,
    handler,
    payload: body,
    collectionId: null,
    targetKey: null,
    dependsOn: [],
    createdAt: 0,
    attempts: 0,
    nextAttemptAt: 0,
    state,
    lastError: null,
    toast: { success: 'Register saved' },
    label: 'Register',
  }
}

const student = (id: number, fname: string, armId: number | null) =>
  ({ id, fname, lname: 'Okafor', regno: `ADM/${id}`, class_arm_id: armId }) as TeacherStudent

const DAY = '2026-09-09'

test('queued marks are read for the arm and day they were made against', () => {
  const ops = [
    op(1, { class_arm_id: 3, date: DAY, marks: { '10': 'present' } }),
    op(2, { class_arm_id: 4, date: DAY, marks: { '11': 'absent' } }),
    op(3, { class_arm_id: 3, date: '2026-09-08', marks: { '12': 'late' } }),
  ]
  assert.deepEqual(queuedMarks(ops, 3, DAY), { '10': 'present' })
})

test('a later mark for the same child wins', () => {
  const ops = [
    op(1, { class_arm_id: 3, date: DAY, marks: { '10': 'present' } }),
    op(2, { class_arm_id: 3, date: DAY, marks: { '10': 'late' } }),
  ]
  assert.deepEqual(queuedMarks(ops, 3, DAY), { '10': 'late' })
})

test('ops are merged in seq order however they arrive', () => {
  const ops = [
    op(2, { class_arm_id: 3, date: DAY, marks: { '10': 'late' } }),
    op(1, { class_arm_id: 3, date: DAY, marks: { '10': 'present' } }),
  ]
  assert.deepEqual(queuedMarks(ops, 3, DAY), { '10': 'late' })
})

/*
 * The one that would be a lie on screen: a refused op is not going to land, so
 * drawing it as a mark would tell the teacher a child was marked when the
 * school said no. The drawer owns that op.
 */
test('a failed op is not drawn as a mark', () => {
  const ops = [op(1, { class_arm_id: 3, date: DAY, marks: { '10': 'present' } }, 'failed')]
  assert.deepEqual(queuedMarks(ops, 3, DAY), {})
})

test('an op still in flight is drawn; one waiting on a person is not', () => {
  // A `needs-review` op was in flight when the tab died and may already have
  // landed — a person has to decide, and until they do it belongs to the
  // drawer, not the sheet.
  const ops = [
    op(1, { class_arm_id: 3, date: DAY, marks: { '10': 'present' } }, 'sending'),
    op(2, { class_arm_id: 3, date: DAY, marks: { '11': 'absent' } }, 'needs-review'),
  ]
  assert.deepEqual(queuedMarks(ops, 3, DAY), { '10': 'present' })
})

test('another kind of queued write is not mistaken for a mark', () => {
  const ops = [
    op(1, { class_arm_id: 3, date: DAY, marks: { '10': 'present' } }, 'queued', 'teaching.addTopic'),
  ]
  assert.deepEqual(queuedMarks(ops, 3, DAY), {})
})

test('the arm and date are compared by value, not by how they were spelled', () => {
  const ops = [op(1, { class_arm_id: '3' as unknown as number, date: DAY, marks: { '10': 'present' } })]
  assert.deepEqual(queuedMarks(ops, 3, DAY), { '10': 'present' })
})

test('a mark carrying a note keeps the note', () => {
  const ops = [
    op(1, { class_arm_id: 3, date: DAY, marks: { '10': { status: 'excused', notes: 'Funeral' } } }),
  ]
  const day = composeDay(undefined, [student(10, 'Ada', 3)], 3, queuedMarks(ops, 3, DAY))
  assert.equal(day.pupils[0].status, 'excused')
  assert.equal(day.pupils[0].notes, 'Funeral')
})

test('the roll is the sheet when the school’s own day is not on the device', () => {
  const roll = [student(10, 'Ada', 3), student(11, 'Chidi', 4), student(12, 'Bola', 3)]
  const day = composeDay(undefined, roll, 3, {})
  assert.deepEqual(day.pupils.map((one) => one.student_id), [10, 12])
  assert.equal(day.known, false)
  assert.equal(day.taken, false)
})

test('nobody is marked by default on a sheet drawn from the roll', () => {
  const day = composeDay(undefined, [student(10, 'Ada', 3)], 3, {})
  assert.equal(day.pupils[0].status, null)
})

test('the school’s own day wins over the roll, marks and all', () => {
  const held: DayRegister = {
    id: '3:2026-09-09',
    date: DAY,
    arm: { class_arm_id: 3, arm_name: 'B', department_id: 1, class: 'JSS 3' },
    pupils: [{ student_id: 99, name: 'Placed since the last sync', regno: null, status: 'present', notes: null }],
    taken: true,
    summary: { present: 1, absent: 0, late: 0, excused: 0, unmarked: 0, pupils: 1 },
  }
  const day = composeDay(held, [student(10, 'Ada', 3)], 3, {})
  assert.deepEqual(day.pupils.map((one) => one.student_id), [99])
  assert.equal(day.known, true)
  assert.equal(day.taken, true)
})

test('a queued mark is drawn over the school’s own and flagged as pending', () => {
  const held: DayRegister = {
    id: '3:2026-09-09',
    date: DAY,
    arm: { class_arm_id: 3, arm_name: 'B', department_id: 1, class: 'JSS 3' },
    pupils: [
      { student_id: 10, name: 'Ada Okafor', regno: 'ADM/10', status: 'absent', notes: null },
      { student_id: 12, name: 'Bola Okafor', regno: 'ADM/12', status: 'present', notes: null },
    ],
    taken: true,
    summary: { present: 1, absent: 1, late: 0, excused: 0, unmarked: 0, pupils: 2 },
  }
  const day = composeDay(held, [], 3, { '10': 'late' })
  assert.equal(day.pupils[0].status, 'late')
  assert.equal(day.pupils[1].status, 'present')
  assert.deepEqual([...day.waiting], [10])
})

test('a day nobody has marked still counts as taken once something is queued', () => {
  const day = composeDay(undefined, [student(10, 'Ada', 3)], 3, { '10': 'present' })
  assert.equal(day.taken, true)
  assert.deepEqual([...day.waiting], [10])
})

test('the roll reads names the school’s way and sorts them', () => {
  const roll = [student(2, 'Zainab', 3), student(1, 'Ada', 3)]
  assert.deepEqual(rollFor(roll, 3).map((one) => one.name), ['Ada Okafor', 'Zainab Okafor'])
})

test('a student in no arm is on nobody’s register', () => {
  assert.deepEqual(rollFor([student(1, 'Ada', null)], 3), [])
})
