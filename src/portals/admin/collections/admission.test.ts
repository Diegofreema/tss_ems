import assert from 'node:assert/strict'
import { test } from 'node:test'
import { admission } from './admission.ts'
import type { Row } from '../../../features/collections/types.ts'

const row = {
  id: '4',
  fname: 'UDOYE',
  mname: 'OZOMGBO',
  lname: 'OKIGBO',
} as Row

test('admitting sets both statuses and the class the reviewer picked', () => {
  const { body, message } = admission(row, {
    decision: 'Admit',
    department_id: '2',
    class_arm_id: '4',
  })
  assert.deepEqual(body, {
    fname: 'UDOYE',
    lname: 'OKIGBO',
    status: 'Admitted',
    studentstatus: 'Active',
    department_id: 2,
    class_arm_id: '4',
  })
  assert.equal(message, 'UDOYE OZOMGBO OKIGBO admitted')
})

test('declining records the refusal and moves nobody into a class', () => {
  const { body, message } = admission(row, {
    decision: 'Decline',
    department_id: '2',
    class_arm_id: '4',
  })
  assert.equal(body.status, 'Declined')
  assert.equal(body.studentstatus, undefined)
  assert.equal(body.department_id, undefined)
  assert.equal(body.class_arm_id, undefined)
  assert.equal(message, 'UDOYE OZOMGBO OKIGBO declined')
})

test('admitting without an arm still names the class', () => {
  const { body } = admission(row, { decision: 'Admit', department_id: '2', class_arm_id: '' })
  assert.equal(body.department_id, 2)
  assert.equal(body.class_arm_id, undefined)
})

test('nothing but the decision is sent, so the family’s own details survive it', () => {
  const { body } = admission(row, { decision: 'Admit', department_id: '2' })
  assert.deepEqual(Object.keys(body).sort(), [
    'class_arm_id', 'department_id', 'fname', 'lname', 'status', 'studentstatus',
  ])
})
