import assert from 'node:assert/strict'
import { test } from 'node:test'
import { byId, newestFirst } from './order.ts'

const ids = <T extends { id: number }>(rows: T[]) => rows.map((row) => row.id)

test('byId reads oldest first whatever order the rows arrived in', () => {
  const rows = [{ id: 90 }, { id: 12 }, { id: 55 }, { id: 3 }]
  assert.deepEqual(ids(byId(rows)), [3, 12, 55, 90])
})

test('byId leaves the rows it was given alone', () => {
  const rows = [{ id: 2 }, { id: 1 }]
  byId(rows)
  assert.deepEqual(ids(rows), [2, 1])
})

test('newestFirst reads the stamp before the id', () => {
  const rows = [
    { id: 1, on: '2026-03-01T09:00:00+01:00' },
    { id: 2, on: '2026-01-05T09:00:00+01:00' },
    { id: 3, on: '2026-05-20T09:00:00+01:00' },
  ]
  assert.deepEqual(ids(newestFirst(rows, (row) => row.on)), [3, 1, 2])
})

/*
 * The whole reason this is not a plain date sort: every stamp on the mark
 * register is null on this deployment, so a comparator that only knew about
 * dates would leave the register in whatever order the collection's keys
 * happened to give it — which is oldest first, the opposite of what the footer
 * promises.
 */
test('newestFirst falls back to the id when nothing is stamped', () => {
  const rows = [{ id: 4, on: null }, { id: 19, on: null }, { id: 7, on: undefined }]
  assert.deepEqual(ids(newestFirst(rows, (row) => row.on)), [19, 7, 4])
})

test('an unstamped row sorts behind every stamped one', () => {
  const rows = [
    { id: 30, on: null },
    { id: 1, on: '2020-01-01T00:00:00+01:00' },
  ]
  assert.deepEqual(ids(newestFirst(rows, (row) => row.on)), [1, 30])
})

test('a stamp that is not a date is treated as no stamp at all', () => {
  const rows = [
    { id: 2, on: 'not a date' },
    { id: 1, on: '2020-01-01T00:00:00+01:00' },
  ]
  assert.deepEqual(ids(newestFirst(rows, (row) => row.on)), [1, 2])
})

test('a blank stamp is no stamp', () => {
  const rows = [{ id: 5, on: '   ' }, { id: 9, on: null }]
  assert.deepEqual(ids(newestFirst(rows, (row) => row.on)), [9, 5])
})
