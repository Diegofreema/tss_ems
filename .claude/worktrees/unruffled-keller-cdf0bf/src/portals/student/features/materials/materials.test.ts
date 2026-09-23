import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { MyMaterial } from '../../../../api/my-schooling/types.ts'
import { materialRows } from './materials.ts'

/*
 * No live row exists to copy: the table is empty across every subject in the
 * school and nothing in the API writes to it. These stand-ins are the shape
 * `MyMaterial` documents, and the point of the tests below is that a row which
 * comes back thinner than the shape still reads as a material rather than as
 * a blank line.
 */
const MATERIAL: MyMaterial = {
  id: 3,
  subject_id: 2,
  title: 'Simultaneous equations — worked examples',
  uploaddate: '2026-08-31T10:19:12+01:00',
  subject: { id: 2, name: 'MATHEMATICS' },
  department: { id: 2, name: 'SSS I' },
}

test('a material reads as its title, its subject and the day it arrived', () => {
  const [row] = materialRows([MATERIAL])
  assert.equal(row.title, 'Simultaneous equations — worked examples')
  assert.equal(row.subject, 'MATHEMATICS')
  assert.equal(row.added, '31 Aug 2026')
  assert.equal(row.klass, 'SSS I')
  assert.equal(row.sharedOn, '31 Aug 2026, 10:19')
})

test('newest first, so this week is at the top', () => {
  const rows = materialRows([
    { ...MATERIAL, id: 1 },
    { ...MATERIAL, id: 9 },
    { ...MATERIAL, id: 4 },
  ])
  assert.deepEqual(rows.map((row) => row.id), ['9', '4', '1'])
})

test('an unexpanded subject is named by its id rather than left blank', () => {
  const [row] = materialRows([{ ...MATERIAL, subject: null }])
  assert.equal(row.subject, 'Subject 2')
})

test('a material with nothing on it still reads as a row a pupil can ask about', () => {
  const [row] = materialRows([{ id: 7 }])
  assert.equal(row.title, 'Material 7')
  assert.equal(row.subject, '—')
  assert.equal(row.added, '—')
  assert.equal(row.klass, '—')
})

test('nothing shared is no rows, not a row of dashes', () => {
  assert.deepEqual(materialRows([]), [])
})
