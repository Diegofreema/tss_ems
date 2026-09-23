import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Row } from '../../../features/collections/types.ts'
import { staffRowKind } from './staff-row.ts'
import {
  byClassAndStatus,
  byClassArmAndStanding,
  byStaffKind,
  byStatusAndCharge,
} from './narrow.ts'

const row = (id: string, department_id: string, status: string): Row => ({
  id,
  department_id,
  status,
})

const ROWS = [
  row('1', '7', 'Active'),
  row('2', '7', 'Archived'),
  row('3', '9', 'Active'),
]

const ids = (rows: Row[]) => rows.map((one) => one.id)

test('nothing set leaves every row', () => {
  assert.deepEqual(ids(byClassAndStatus(ROWS, {})), ['1', '2', '3'])
  assert.deepEqual(ids(byClassAndStatus(ROWS, { department_id: '', status: '' })), [
    '1',
    '2',
    '3',
  ])
})

test('a class narrows to its own', () => {
  assert.deepEqual(ids(byClassAndStatus(ROWS, { department_id: '7' })), ['1', '2'])
})

test('a status narrows to it, by the word the register prints', () => {
  assert.deepEqual(ids(byClassAndStatus(ROWS, { status: 'Active' })), ['1', '3'])
  assert.deepEqual(ids(byClassAndStatus(ROWS, { status: 'Archived' })), ['2'])
})

test('the two combine', () => {
  assert.deepEqual(
    ids(byClassAndStatus(ROWS, { department_id: '7', status: 'Active' })),
    ['1'],
  )
})

/*
 * The one that would have been quiet: a filter's value comes off the URL and is
 * a string, whatever the row spells it as.
 */
test('a class id is compared as text, not as a number', () => {
  const numeric = [{ id: '1', department_id: 7 as unknown as string, status: 'Active' }]
  assert.deepEqual(ids(byClassAndStatus(numeric, { department_id: '7' })), ['1'])
})

test('a row with no class is not matched by a class filter', () => {
  const orphan = [{ id: '1', status: 'Active' } as Row]
  assert.deepEqual(ids(byClassAndStatus(orphan, { department_id: '7' })), [])
  assert.deepEqual(ids(byClassAndStatus(orphan, {})), ['1'])
})


/*
 * The fee catalogue's filters do not speak the words its rows print: `status`
 * arrives as the endpoint's 1 or 0, and the charge as the raw `feetype`.
 */
const FEES: Row[] = [
  { id: '1', status: 'Active', feetype: 'enrolled' },
  { id: '2', status: 'Inactive', feetype: 'enrolled' },
  { id: '3', status: 'Active', feetype: 'none_enrolled' },
]

test("a fee status filter speaks the endpoint's numbers", () => {
  assert.deepEqual(ids(byStatusAndCharge(FEES, { status: '1' })), ['1', '3'])
  assert.deepEqual(ids(byStatusAndCharge(FEES, { status: '0' })), ['2'])
})

test('a charge filter matches the raw feetype, not the phrase on the column', () => {
  assert.deepEqual(ids(byStatusAndCharge(FEES, { feetype: 'enrolled' })), ['1', '2'])
  assert.deepEqual(ids(byStatusAndCharge(FEES, { feetype: 'none_enrolled' })), ['3'])
})

test('the two fee filters combine', () => {
  assert.deepEqual(
    ids(byStatusAndCharge(FEES, { status: '1', feetype: 'enrolled' })),
    ['1'],
  )
})

test('nothing set leaves the whole catalogue', () => {
  assert.deepEqual(ids(byStatusAndCharge(FEES, {})), ['1', '2', '3'])
  assert.deepEqual(ids(byStatusAndCharge(FEES, { status: '', feetype: '' })), [
    '1',
    '2',
    '3',
  ])
})


/*
 * The student register merges the school's two words for a student's standing
 * into one column, so its filters read the unmerged pair beside it.
 */
const STUDENTS: Row[] = [
  { id: '1', department_id: '7', class_arm_id: '3', admission: 'Admitted', studentstatus: 'Active' },
  { id: '2', department_id: '7', class_arm_id: '4', admission: 'Admitted', studentstatus: 'Suspended' },
  { id: '3', department_id: '9', class_arm_id: '5', admission: 'Applied', studentstatus: '' },
]

test('a class or an arm narrows the roll', () => {
  assert.deepEqual(ids(byClassArmAndStanding(STUDENTS, { department_id: '7' })), ['1', '2'])
  assert.deepEqual(ids(byClassArmAndStanding(STUDENTS, { class_arm_id: '4' })), ['2'])
})

test('admission and enrolment are two different filters', () => {
  assert.deepEqual(ids(byClassArmAndStanding(STUDENTS, { status: 'Applied' })), ['3'])
  assert.deepEqual(ids(byClassArmAndStanding(STUDENTS, { studentstatus: 'Suspended' })), ['2'])
})

test('the four combine', () => {
  assert.deepEqual(
    ids(
      byClassArmAndStanding(STUDENTS, {
        department_id: '7',
        status: 'Admitted',
        studentstatus: 'Active',
      }),
    ),
    ['1'],
  )
})

test('nothing set leaves the whole roll', () => {
  assert.deepEqual(ids(byClassArmAndStanding(STUDENTS, {})), ['1', '2', '3'])
})


/*
 * The staff page holds two registers in one set — the teaching records and the
 * office ones — and its dropdown swaps between them rather than narrowing.
 */
const STAFF: Row[] = [
  { id: 't-1', name: 'A teacher' },
  { id: 'a-2', name: 'An administrator' },
  { id: '3', name: 'A teacher with a bare id' },
  // A record created offline: keyed `local:`, so only its own words say which
  // register it belongs to.
  { id: 'local:9', name: 'A queued administrator', role: 'Administrators' },
]

/* The real reader, so this cannot pass against a format nobody uses. */
const kindOf = staffRowKind

test('unset, the staff register is the teaching records', () => {
  assert.deepEqual(ids(byStaffKind(STAFF, {}, 'Administrators', kindOf)), [
    't-1',
    '3',
  ])
})

test('picking the other one is the other register, not a narrowing', () => {
  assert.deepEqual(
    ids(byStaffKind(STAFF, { role: 'Administrators' }, 'Administrators', kindOf)),
    ['a-2', 'local:9'],
  )
})

test('a word that is not the office register leaves the teaching one', () => {
  assert.deepEqual(ids(byStaffKind(STAFF, { role: '' }, 'Administrators', kindOf)), [
    't-1',
    '3',
  ])
})
