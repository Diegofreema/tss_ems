import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filledColumns } from './columns.ts'
import type { ColumnSpec, Row } from './types.ts'

const SPECS: ColumnSpec[] = [
  { key: 'name', label: 'Student', cardRole: 'title' },
  { key: 'subject', label: 'Subject', cardRole: 'subtitle' },
  { key: 'klass', label: 'Class' },
  { key: 'total', label: 'Total', align: 'right' },
]

const row = (over: Partial<Row>): Row => ({
  id: '1',
  name: 'Ada Obi',
  subject: 'English',
  klass: '\u2014',
  total: '85',
  ...over,
})

const keys = (specs: ColumnSpec[]) => specs.map((spec) => spec.key)

test('a column every row leaves blank is dropped', () => {
  assert.deepEqual(keys(filledColumns(SPECS, [row({}), row({ id: '2' })])), [
    'name',
    'subject',
    'total',
  ])
})

test('one row carrying it is enough to keep the column', () => {
  const rows = [row({}), row({ id: '2', klass: 'JSS 1' })]
  assert.ok(keys(filledColumns(SPECS, rows)).includes('klass'))
})

test('an empty register keeps every column, so the header still explains it', () => {
  assert.deepEqual(keys(filledColumns(SPECS, [])), keys(SPECS))
})

test('the card layout title is kept even when every row leaves it blank', () => {
  const rows = [row({ name: '\u2014', subject: '\u2014', klass: '\u2014', total: '\u2014' })]
  assert.deepEqual(keys(filledColumns(SPECS, rows)), ['name'])
})

test('an empty string counts as blank, and a zero does not', () => {
  assert.ok(!keys(filledColumns(SPECS, [row({ klass: '' })])).includes('klass'))
  assert.ok(keys(filledColumns(SPECS, [row({ klass: '0' })])).includes('klass'))
})

test('whitespace is not data', () => {
  assert.ok(!keys(filledColumns(SPECS, [row({ klass: '   ' })])).includes('klass'))
})

test('a cell that is not a string cannot take the register down', () => {
  /*
   * The library page, 2026-09-16: `isavailable` changed from "Available" to a
   * number under the row builder, and the raw value reached this function.
   * `value.trim()` threw through the whole register and the route boundary
   * reported it as "We could not reach the school system" — about an answer
   * the school had given in full.
   */
  const specs = [
    { key: 'title', label: 'Title' },
    { key: 'lending', label: 'Lending' },
  ]
  const rows = [{ id: '1', title: 'General Maths', lending: 14 }] as unknown as Row[]

  assert.doesNotThrow(() => filledColumns(specs, rows))
  // And it is a filled column, not a dropped one: 14 is a value.
  assert.deepEqual(filledColumns(specs, rows).map((one) => one.key), ['title', 'lending'])
})

test('a null cell is still an empty one', () => {
  const specs = [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
  ]
  const rows = [{ id: '1', title: 'General Maths', author: null }] as unknown as Row[]
  assert.deepEqual(filledColumns(specs, rows).map((one) => one.key), ['title'])
})
