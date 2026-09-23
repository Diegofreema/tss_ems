import assert from 'node:assert/strict'
import { test } from 'node:test'
import { settledValue } from './settled.ts'
import type { FieldSpec } from './types.ts'

const SUBJECT: FieldSpec = {
  key: 'subject_id',
  label: 'Subject',
  required: true,
  optionsFrom: 'my-subjects',
}

test('a feed field the page already decided is settled', () => {
  assert.equal(settledValue(SUBJECT, { subject_id: '4' }, false), '4')
})

test('nothing is settled on an edit — the record is what the form opens on', () => {
  assert.equal(settledValue(SUBJECT, { subject_id: '4' }, true), undefined)
})

test('a preset for another field leaves this one asking', () => {
  assert.equal(settledValue(SUBJECT, { class_id: '2' }, false), undefined)
})

test('an empty or blank preset is not an answer', () => {
  assert.equal(settledValue(SUBJECT, { subject_id: '' }, false), undefined)
  assert.equal(settledValue(SUBJECT, { subject_id: '   ' }, false), undefined)
  assert.equal(settledValue(SUBJECT, undefined, false), undefined)
})

test('a field with no feed keeps its box — an id has nothing to be named by', () => {
  const title: FieldSpec = { key: 'title', label: 'Topic' }
  assert.equal(settledValue(title, { title: 'Quadratics' }, false), undefined)
})

test('a set of ids is not one decision taken elsewhere', () => {
  const fees: FieldSpec = { key: 'fees', label: 'Fees', optionsFrom: 'fees', multi: true }
  assert.equal(settledValue(fees, { fees: '1,2' }, false), undefined)
})

test('a narrowed feed still asks, since its scope is another field', () => {
  const arm: FieldSpec = {
    key: 'class_arm_id',
    label: 'Arm',
    optionsFrom: 'arms',
    dependsOn: 'department_id',
  }
  assert.equal(settledValue(arm, { class_arm_id: '7' }, false), undefined)
})
