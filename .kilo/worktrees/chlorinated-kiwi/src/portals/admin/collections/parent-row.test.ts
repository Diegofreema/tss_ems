import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Child, Parent } from '../../../api/parents/types.ts'
import {
  accessAction,
  childRow,
  parentDeleteBody,
  parentName,
  parentRow,
  parentStatus,
} from './parent-row.ts'

const parent: Parent = {
  id: 7, user_id: 41,
  fathersname: 'Emmanuel Udo', mothersname: 'Chidinma Udo',
  pemailaddress: 'e.udo@example.com',
  fatherphone: '08034412280', motherphone: '08126607714',
  fathersjob: 'Engineer', mothersjob: 'Trader',
  address: '14 Ogui Road, Enugu', occupation: null,
  status: 'active', username: 'eudo',
}

const child: Child = {
  id: 3, regno: 'NEB/2021/0412', fname: 'Chinedu', lname: 'Udo', mname: null,
  gender: 'Male', studentstatus: 'Active', department_id: 5,
  department: 'SS 2', class_arm: 'SS2 B',
}

test('a household is named as both parents where the school holds both', () => {
  assert.equal(parentName(parent), 'Emmanuel Udo & Chidinma Udo')
})

test('one parent on record is named alone, with no stray ampersand', () => {
  assert.equal(parentName({ ...parent, mothersname: null }), 'Emmanuel Udo')
  assert.equal(parentName({ ...parent, fathersname: '  ' }), 'Chidinma Udo')
})

test('a household with no name at all falls back to the email', () => {
  const nameless = parentRow({ ...parent, fathersname: null, mothersname: null })
  assert.equal(nameless.name, 'e.udo@example.com')
})

test('the API lower-cases its statuses and the register does not', () => {
  assert.equal(parentStatus('active'), 'Active')
  assert.equal(parentStatus('deactivated'), 'Deactivated')
  assert.equal(parentStatus(null), '—')
})

test('the phone falls back to the mother where no father is on record', () => {
  assert.equal(parentRow(parent).phone, '08034412280')
  assert.equal(parentRow({ ...parent, fatherphone: null }).phone, '08126607714')
})

test('the panel lines join only the parts a record carries', () => {
  const row = parentRow({ ...parent, mothersjob: null })
  assert.equal(row.father, 'Emmanuel Udo · 08034412280 · Engineer')
  assert.equal(row.mother, 'Chidinma Udo · 08126607714')
})

test('columns the list endpoint cannot answer for are not invented', () => {
  const row = parentRow(parent)
  // Blank, never "0": the list is told nothing about the children, which is a
  // different thing from being told the household has none.
  assert.equal(row.children, '—')
  assert.equal('owing' in row, false)
})

test('a child reads their class and arm apart', () => {
  const row = childRow(child)
  assert.equal(row.name, 'Chinedu Udo')
  assert.equal(row.class, 'SS 2')
  assert.equal(row.arm, 'SS2 B')
  assert.equal(row.adm, 'NEB/2021/0412')
})

test('a child not yet given a reg number reads blank', () => {
  assert.equal(childRow({ ...child, regno: null }).adm, '—')
})

/** The one household on bronze, as `GET /sparents/1` answers it. */
const HOUSEHOLD: Parent = {
  id: 1,
  user_id: 478,
  fathersname: 'Udoye Okagbue',
  mothersname: 'Mgbeke Nuche',
  pemailaddress: 'parent1@netpro.com',
  fatherphone: '09000000000',
  motherphone: '0900000',
  fathersjob: null,
  mothersjob: null,
  address: 'ROAD 2, HOUSE 42, HEARTLAND COURT',
  occupation: null,
  status: 'active',
  username: 'parent1@netpro.com',
  children: [
    { id: 7, regno: null, fname: 'NewOKEREKE', lname: 'NDIDI', mname: 'FGF', gender: 'Male', studentstatus: null, department_id: 1, department: 'JSS 1', class_arm: 'JSS1 A' },
    { id: 8, regno: null, fname: 'NOKEREKE', lname: 'NDIDI', mname: 'FGF', gender: 'Male', studentstatus: null, department_id: 1, department: 'JSS 1', class_arm: 'JSS1 A' },
  ],
}

test('children are counted where the detail expanded them, blank where not', () => {
  // They sit beside the record in the envelope; the register is told nothing
  // about them, and blank says that rather than claiming a household of none.
  assert.equal(parentRow(HOUSEHOLD).children, '2')
  const { children: _none, ...listed } = HOUSEHOLD
  assert.equal(parentRow(listed).children, '—')
})

test('a household with children cannot be deleted, and the dialog says why', () => {
  const body = parentDeleteBody(parentRow(HOUSEHOLD))
  assert.match(body, /2 students are linked/)
  assert.match(body, /refuse to delete/)
  assert.doesNotMatch(body, /permanently/)
})

test('one child is named in the singular', () => {
  const alone = { ...HOUSEHOLD, children: HOUSEHOLD.children!.slice(0, 1) }
  assert.match(parentDeleteBody(parentRow(alone)), /1 student is linked/)
})

test('an empty household is deletable, and offered the lesser answer first', () => {
  const empty = { ...HOUSEHOLD, children: [] }
  const body = parentDeleteBody(parentRow(empty))
  assert.match(body, /Udoye Okagbue & Mgbeke Nuche/)
  assert.match(body, /permanently/)
  assert.match(body, /deactivate the account instead/i)
})

test('the sign-in action offers whichever state the household is not in', () => {
  const active = parentRow(HOUSEHOLD)
  assert.equal(accessAction.label(active), 'Block sign-in')
  // Taking it away is asked about; giving it back is not.
  assert.ok(accessAction.confirm(active))
  assert.match(accessAction.done(active), /can no longer sign in/)

  const blocked = parentRow({ ...HOUSEHOLD, status: 'deactivated' })
  assert.equal(accessAction.label(blocked), 'Allow sign-in')
  assert.equal(accessAction.confirm(blocked), undefined)
  assert.match(accessAction.done(blocked), /can sign in again/)
})

test('a household deleted from the register promises nothing about children', () => {
  // The list is told no count, so neither of the other two sentences is true
  // of it — this household has four students and the row cannot know.
  const { children: _none, ...listed } = HOUSEHOLD
  const body = parentDeleteBody(parentRow(listed))
  assert.match(body, /the register will refuse/)
  assert.match(body, /open the record first/)
  assert.doesNotMatch(body, /students are linked/)
})
