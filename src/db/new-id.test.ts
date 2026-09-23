import assert from 'node:assert/strict'
import { test } from 'node:test'

import { idOfAnswer, idUnder, noNewId } from './new-id.ts'

test('reads the id out of the key the endpoint nests the record under', () => {
  assert.equal(idUnder('student')({ student: { id: 41, fname: 'Ngozi' } }), 41)
  assert.equal(idUnder('class_arm')({ class_arm: { id: 3 } }), 3)
  assert.equal(idUnder('semester')({ semester: { id: 12 } }), 12)
})

test('takes the record from an envelope carrying more than the record', () => {
  // Creating a guardian answers with the login the school issued alongside it,
  // which `loginNote` reads. Three keys, so "unwrap the only one" would fail.
  const answer = { sparent: { id: 7 }, username: 'UDOYE2608', password: 'x' }
  assert.equal(idUnder('sparent')(answer), 7)
})

test('a string id is kept as a string', () => {
  assert.equal(idUnder('fee')({ fee: { id: 'fee-9' } }), 'fee-9')
})

test('answers nothing rather than guessing', () => {
  const student = idUnder('student')
  // The old reader looked here, which is why nothing was ever recorded.
  assert.equal(student({ id: 41 }), undefined)
  assert.equal(student({ student: {} }), undefined)
  assert.equal(student({ student: null }), undefined)
  assert.equal(student({ student: { id: { nested: 1 } } }), undefined)
  assert.equal(student(null), undefined)
  assert.equal(student('ok'), undefined)
  assert.equal(student(undefined), undefined)
})

test('an already-unwrapped record is read directly', () => {
  assert.equal(idOfAnswer({ id: 88 }), 88)
  assert.equal(idOfAnswer({ paper: { id: 88 } }), undefined)
  assert.equal(idOfAnswer(null), undefined)
})

test('a write that creates nothing says so', () => {
  assert.equal(noNewId(), undefined)
})
