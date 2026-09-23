import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classSheet, figure, sheetCaption, sheetPupil } from './class-sheet.ts'

/*
 * Every shape below is a guess by construction — `GET /results/class-sheet`
 * has never been read with a class on it. What these prove is that the reader
 * finds the pupils, the subjects and the position out of whatever it is
 * handed, not that any one of these shapes is the real one.
 */

const NESTED = {
  department: { id: 1, name: 'JSS 1' },
  semester: { id: 1, name: 'First Term' },
  students: [
    {
      student: { id: 483, fname: 'Ada', lname: 'Obi', regno: 'NP/001' },
      subjects: [
        { subject_id: 1, subject_name: 'ENGLISH', total: '85.00' },
        { subject_id: 2, subject_name: 'MATHS', total: '72.00' },
      ],
      total: '157.00',
      average: '78.50',
      position: '1',
    },
    {
      student: { id: 484, fname: 'Bola', lname: 'Ade', regno: 'NP/002' },
      // No maths mark at all: the column must still exist for Ada.
      subjects: [{ subject_id: 1, subject_name: 'ENGLISH', total: '60.00' }],
      total: '60.00',
      average: '60.00',
      position: '2',
    },
  ],
}

test('the broadsheet reads pupils down and subjects across', () => {
  const sheet = classSheet(NESTED)
  assert.deepEqual(
    sheet.columns.map((column) => column.label),
    ['ENGLISH', 'MATHS'],
  )
  assert.equal(sheet.rows.length, 2)
  assert.equal(sheet.rows[0].pupil, 'Ada Obi')
  assert.equal(sheet.rows[0].adm, 'NP/001')
  assert.equal(sheet.rows[0].marks['1'], '85')
  assert.equal(sheet.rows[0].position, '1')
})

test('a subject only one pupil sat is still a column', () => {
  // Taken across every pupil, not off the first: a column missing because the
  // first child on the register skipped that test would drop a whole subject.
  const sheet = classSheet(NESTED)
  assert.equal(sheet.columns.length, 2)
  assert.equal(sheet.rows[1].marks['2'], undefined)
})

test('a flat pupil row with a subject map reads the same way', () => {
  const sheet = classSheet({
    rows: [
      {
        id: 9,
        name: 'Chidi Nwosu',
        regno: 'NP/003',
        marks: { ENGLISH: 70, MATHS: 55 },
        total: 125,
        average: 62.5,
        rank: 3,
      },
    ],
  })
  assert.deepEqual(
    sheet.columns.map((column) => column.label),
    ['ENGLISH', 'MATHS'],
  )
  assert.equal(sheet.rows[0].pupil, 'Chidi Nwosu')
  assert.equal(sheet.rows[0].marks.ENGLISH, '70')
  assert.equal(sheet.rows[0].position, '3')
})

test('position is read, never worked out', () => {
  // A second opinion about who came first is the last thing a school needs.
  const sheet = classSheet({ students: [{ name: 'A', total: 10 }, { name: 'B', total: 90 }] })
  assert.equal(sheet.rows[0].position, '—')
  assert.equal(sheet.rows[1].position, '—')
})

test('a pupil with no name is still identified', () => {
  assert.equal(sheetPupil({ regno: 'NP/009' }), 'NP/009')
  assert.equal(sheetPupil({ student: { fname: 'Ada' } }), 'Ada')
  assert.equal(sheetPupil({ fullname: 'Ada Obi' }), 'Ada Obi')
})

test('a mark reads whole, and no mark reads blank rather than nought', () => {
  assert.equal(figure('85.00'), '85')
  assert.equal(figure(85.5), '85.5')
  assert.equal(figure(null), '—')
  assert.equal(figure(''), '—')
  assert.equal(figure('absent'), 'absent')
})

test('an answer that never arrived draws an empty sheet, not a broken one', () => {
  assert.deepEqual(classSheet(undefined), { columns: [], rows: [] })
  assert.deepEqual(classSheet({}), { columns: [], rows: [] })
  assert.equal(sheetCaption(undefined), '')
})

test('the caption names what the office is looking at', () => {
  assert.equal(sheetCaption(NESTED), 'JSS 1 · First Term')
})
