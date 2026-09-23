import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CA_MAX, EXAM_MAX, markOf, sheetAverage, totalOf } from './grade.ts'

test('the caps are the endpoint\u2019s, not the design\u2019s', () => {
  // `POST /teachers/me/scores` refuses a CA above 40 or an exam above 60; the
  // handoff drew 30 and 70, and a sheet drawn to those would be refused.
  assert.equal(CA_MAX, 40)
  assert.equal(EXAM_MAX, 60)
})

test('blank and junk marks count as zero', () => {
  assert.equal(markOf(''), 0)
  assert.equal(markOf('abc'), 0)
  assert.equal(markOf('26'), 26)
  assert.equal(totalOf('26', '52'), 78)
  assert.equal(totalOf('', '43'), 43)
})

test('sheet average rounds to a whole mark', () => {
  assert.equal(sheetAverage([]), 0)
  assert.equal(sheetAverage([78, 82, 74]), 78)
  assert.equal(sheetAverage([70, 71]), 71)
})
