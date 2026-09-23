import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { SearchResults, SearchRow } from '../../../../api/search/types.ts'
import { countLine, groups, summary, tooShort } from './search.ts'

const row = (over: Partial<SearchRow>): SearchRow => ({
  kind: 'student',
  id: 2,
  name: 'OBI IGBO AJA',
  detail: 'NETPRO/2026/2 · JSS 1',
  contact: '090000000000',
  ...over,
})

const results = (over: Partial<SearchResults>): SearchResults => ({
  query: 'Obi',
  students: [],
  parents: [],
  teachers: [],
  counts: { students: 0, parents: 0, teachers: 0 },
  total: 0,
  searched: ['students', 'parents', 'teachers'],
  limit: 10,
  ...over,
})

test('the three registers come back in a fixed order', () => {
  assert.deepEqual(
    groups(results({})).map((group) => group.register),
    ['students', 'parents', 'teachers'],
  )
})

test('a register left out of `searched` is not the same as one with no matches', () => {
  const [students, guardians] = groups(
    results({ searched: ['teachers'], counts: { students: 0, parents: 0, teachers: 0 } }),
  )
  assert.equal(students.searched, false)
  assert.equal(countLine(students), 'not searched')
  assert.equal(guardians.searched, false)
})

test('a register that was searched and found nobody says so plainly', () => {
  const [students] = groups(results({}))
  assert.equal(students.searched, true)
  assert.equal(countLine(students), 'none')
})

test('a list cut to the limit says how many there really are', () => {
  const [students] = groups(
    results({
      students: [row({ id: 1 }), row({ id: 2 })],
      counts: { students: 40, parents: 0, teachers: 0 },
    }),
  )
  assert.equal(countLine(students), 'showing 2 of 40')
})

test('a complete list is just its count', () => {
  const [students] = groups(
    results({ students: [row({})], counts: { students: 1, parents: 0, teachers: 0 } }),
  )
  assert.equal(countLine(students), '1')
})

test('a register the server did not send at all reads as empty, not as a crash', () => {
  const [students] = groups(
    results({ students: undefined as unknown as SearchRow[] }),
  )
  assert.deepEqual(students.rows, [])
})

test('the summary counts every register that answered', () => {
  const line = summary(
    results({
      students: [row({}), row({ id: 3 })],
      parents: [row({ kind: 'parent', id: 1 })],
      counts: { students: 2, parents: 1, teachers: 0 },
    }),
    'Obi',
  )
  assert.equal(line, '2 students, 1 guardian matching “Obi”.')
})

test('the summary is singular where there is one of something', () => {
  const line = summary(
    results({ students: [row({})], counts: { students: 1, parents: 0, teachers: 0 } }),
    'Obi',
  )
  assert.equal(line, '1 student matching “Obi”.')
})

test('nothing anywhere says nothing, rather than an empty sentence', () => {
  assert.equal(summary(results({}), 'Zzz'), 'Nothing matches “Zzz”.')
  assert.equal(summary(undefined, 'Zzz'), '')
})

test('one character is too short; none and two are not', () => {
  assert.equal(tooShort('O'), true)
  assert.equal(tooShort('Ob'), false)
  assert.equal(tooShort(''), false)
  assert.equal(tooShort('  '), false)
})
