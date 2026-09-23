import assert from 'node:assert/strict'
import { test } from 'node:test'
import { RESULT_COLUMNS, templateName, templateSheet } from './result-template.ts'

/**
 * The headings are taken from the sheet the school actually accepts
 * (`result_format_new1.xlsx`), in that order. The parser reads by position, so
 * this test is the contract: change the order and a class's exam marks land in
 * the CA column.
 */
test('the columns are the ones the office parses, in order', () => {
  assert.deepEqual(
    [...RESULT_COLUMNS],
    ['Registration Number', 'CA', '1st Exam', '2nd Exam', '3rd Exam'],
  )
})

test('the heading row comes first, and every heading is marked as one', () => {
  const [heading] = templateSheet([])
  assert.deepEqual(
    heading.map((cell) => cell?.value),
    ['Registration Number', 'CA', '1st Exam', '2nd Exam', '3rd Exam'],
  )
  assert.ok(heading.every((cell) => cell?.heading))
})

test('an empty roll is still a usable template', () => {
  assert.equal(templateSheet([]).length, 1)
})

test('every student gets a row, with the four mark cells left to type into', () => {
  const rows = templateSheet(['NETPRO/2026/2', 'NETPRO/2026/3'])
  assert.equal(rows.length, 3)
  assert.deepEqual(rows[1], [
    { value: 'NETPRO/2026/2' },
    null,
    null,
    null,
    null,
  ])
})

test('every row carries five cells, so the columns line up before anything is typed', () => {
  for (const row of templateSheet(['NETPRO/2026/1', 'NETPRO/2026/2'])) {
    assert.equal(row.length, 5)
  }
})

test('the registration number is not a heading, so it is not styled as one', () => {
  const [, first] = templateSheet(['NETPRO/2026/1'])
  assert.equal(first[0]?.heading, undefined)
})

test('surrounding space is trimmed, so a stray one is not read as part of the number', () => {
  const [, first] = templateSheet(['  NETPRO/2026/1  '])
  assert.equal(first[0]?.value, 'NETPRO/2026/1')
})

test('a student with no registration number is left out rather than given a blank row', () => {
  // The office matches a line by its number; a blank one is a line it throws
  // away, and a row of marks nobody can place is worse than a row missing.
  assert.equal(templateSheet(['', '   ', 'NETPRO/2026/1']).length, 2)
})

test('the file is named for the subject and arm it was built for', () => {
  assert.equal(
    templateName('Integrated Science', 'JSS1 A'),
    'results-integrated-science-jss1-a.xlsx',
  )
  assert.equal(templateName(), 'results.xlsx')
  assert.equal(templateName('Mathematics'), 'results-mathematics.xlsx')
})
