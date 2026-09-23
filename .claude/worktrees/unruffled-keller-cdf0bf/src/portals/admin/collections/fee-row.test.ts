import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Fee } from '../../../api/fees/types.ts'
import {
  activateAction,
  allocatedTo,
  feeBody,
  feeCharge,
  feeRow,
} from './fee-row.ts'

/** Exactly a row of the captured `GET /fees`, which matches what live
 *  `/invoices` embeds under `fee`. */
const tuition = {
  id: 1,
  name: 'TUITION FEE',
  amount: 30000,
  status: 1,
  is_active: true,
  feetype: 'enrolled',
  itemcode: '10001001',
  remitaitemcode: null,
  startdate: null,
  enddate: null,
  user_id: 1,
  created_by: 'Chukwudi Aniegboka',
} as unknown as Fee

test('the catalogue writes the amount as money', () => {
  assert.equal(feeRow(tuition).amount, '₦30,000')
})

test('the two words feetype takes are said the way an office says them', () => {
  assert.equal(feeCharge('enrolled'), 'Enrolled pupils')
  assert.equal(feeCharge('none_enrolled'), 'Not yet enrolled')
  // A third word this API grows is shown as sent rather than guessed at.
  assert.equal(feeCharge('boarders'), 'boarders')
})

test('a retired fee reads inactive, whichever field the payload carries', () => {
  assert.equal(feeRow(tuition).status, 'Active')
  assert.equal(feeRow({ ...tuition, is_active: false } as Fee).status, 'Inactive')
  // An older payload without `is_active` still answers, off the number.
  const legacy = { ...tuition, is_active: undefined, status: 0 } as unknown as Fee
  assert.equal(feeRow(legacy).status, 'Inactive')
})

test('a fee nobody has allocated says so rather than reading blank', () => {
  assert.equal(feeRow(tuition).classes, 'Not allocated')
  const allocated = {
    ...tuition,
    departments: [
      { id: 1, name: 'JSS 1' },
      { id: 2, name: 'JSS II' },
    ],
  } as Fee
  assert.equal(feeRow(allocated).classes, 'JSS 1, JSS II')
  assert.deepEqual(allocatedTo(allocated), ['1', '2'])
  assert.deepEqual(allocatedTo(tuition), [])
  // The allocate flow opens with these ticked, so it reads ids, not names.
  assert.equal(feeRow(allocated).classIds, '1,2')
  assert.equal(feeRow(tuition).classIds, '')
})

test('the button offers the state the fee is not in', () => {
  assert.equal(activateAction('Active').label, 'Deactivate')
  assert.equal(activateAction('Active').activate, false)
  assert.equal(activateAction('Inactive').label, 'Activate')
  assert.equal(activateAction('Inactive').activate, true)
})

test('the edit form gets the raw figure, not the written amount', () => {
  // The numeric field refuses a naira sign, so prefilling it with one would
  // make an untouched form unsaveable.
  assert.equal(feeRow(tuition).figure, '30000')
  assert.equal(feeRow(tuition).feetype, 'enrolled')
})

test('the amount goes as typed, since the endpoint normalises it itself', () => {
  assert.equal(feeBody({ figure: '30,000' }).amount, '30,000')
  assert.equal(feeBody({ figure: ' 30000.00 ' }).amount, '30000.00')
})

test('the body never touches the allocation, which the form does not ask about', () => {
  // Passing `departments` replaces the whole set, so saving an edit would
  // silently unallocate every class the fee is charged to.
  const body = feeBody({ name: 'BUS FEE', figure: '30000' })
  assert.equal('departments' in body, false)
  assert.equal('levels' in body, false)
})

test('an item code left empty is left out rather than sent blank', () => {
  assert.equal(feeBody({ itemcode: '  ' }).itemcode, undefined)
  assert.equal(feeBody({ itemcode: '10001001' }).itemcode, '10001001')
})

test('a fee saved without a charge type defaults to the enrolled one', () => {
  assert.equal(feeBody({}).feetype, 'enrolled')
})
