import assert from 'node:assert/strict'
import { test } from 'node:test'
import { moveOutcome, studentMove } from './student-move.ts'

const from = { departmentId: '1' }

test('staying in the class and changing arm is a transfer', () => {
  const move = studentMove({ picks: ['10', '16'], department_id: '1', class_arm_id: '9' }, from)
  assert.deepEqual(move, { kind: 'transfer', armId: 9, body: { student_ids: [10, 16] } })
})

test('changing class is a promotion, and carries the arm when one is picked', () => {
  const move = studentMove({ picks: ['10'], department_id: '2', class_arm_id: '4' }, from)
  assert.deepEqual(move, {
    kind: 'promote',
    body: { student_ids: [10], department_id: 2, class_arm_id: 4 },
  })
})

test('a promotion with no arm leaves the students unplaced rather than sending a zero', () => {
  const move = studentMove({ picks: ['10'], department_id: '2', class_arm_id: '' }, from)
  assert.equal(move.kind === 'promote' && move.body.class_arm_id, undefined)
})

test('the transfer result names whoever the API refused', () => {
  const move = studentMove({ picks: ['10', '16'], department_id: '1', class_arm_id: '9' }, from)
  const outcome = moveOutcome(
    move,
    { assigned: [10], failed: [{ student_id: 16, reason: 'Not in this class' }] },
    (id) => (id === 16 ? 'OKONKWO ARINZE' : `Student ${id}`),
  )
  assert.equal(outcome.message, '1 student moved')
  assert.deepEqual(outcome.failures, ['OKONKWO ARINZE — Not in this class'])
})

test('a promotion the API says nothing about counts everyone asked for', () => {
  const move = studentMove({ picks: ['10', '16'], department_id: '2', class_arm_id: '4' }, from)
  const outcome = moveOutcome(move, undefined, String)
  assert.equal(outcome.message, '2 students moved')
  assert.deepEqual(outcome.failures, [])
})
