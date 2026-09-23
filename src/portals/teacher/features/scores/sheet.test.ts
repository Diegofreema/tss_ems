import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TeacherResult, TeacherStudent } from '../../../../api/teaching/types.ts'
import type { MarkingTerm } from '../term/term.ts'
import { changedMarks, saveLabel, sheetRows } from './sheet.ts'

/** Two students off GET /teachers/me/students, both in arm 3. */
const STUDENTS = [
  { id: 10, fname: 'Aniegbokas', lname: 'Chukwudi', regno: 'MGS/2020535', class_arm_id: 3 },
  { id: 16, fname: 'OKONKWO', mname: 'UCHE', lname: 'ARINZE', regno: 'NETPRO/2026/16', class_arm_id: 3 },
] as unknown as TeacherStudent[]

/** One mark already on file, from GET /teachers/me/results. */
const HELD = [
  {
    id: 5,
    student_id: 10,
    subject_id: 1,
    ca: '6',
    score: '62.00',
    total: '68',
    grade: 'B',
    approval_status: 'pending',
  },
] as unknown as TeacherResult[]

const TERM: MarkingTerm = { session_id: 8, semester_id: 1, label: 'First Term · 2024/2025' }

test('the sheet shows the mark the school holds, and a blank where it holds none', () => {
  const [held, blank] = sheetRows(STUDENTS, HELD, 1, {})
  assert.equal(held.ca, '6')
  assert.equal(held.exam, '62')
  assert.equal(held.total, 68)
  assert.equal(held.grade, 'B')
  assert.equal(held.edited, false)

  assert.equal(blank.name, 'OKONKWO UCHE ARINZE')
  assert.equal(blank.ca, '')
  assert.equal(blank.grade, '')
  assert.equal(blank.edited, false)
})

test("a mark in another subject is not this sheet's", () => {
  assert.equal(sheetRows(STUDENTS, HELD, 2, {})[0].ca, '')
})

test('an edited row loses the grade, because the school works it out', () => {
  const rows = sheetRows(STUDENTS, HELD, 1, { '1|10': { exam: '55' } })
  assert.equal(rows[0].edited, true)
  assert.equal(rows[0].grade, '')
  assert.equal(rows[0].total, 61)
})

test('typing a mark back to what it was is not an edit', () => {
  const rows = sheetRows(STUDENTS, HELD, 1, { '1|10': { exam: '62' } })
  assert.equal(rows[0].edited, false)
})

test('a mark already on file is not flagged, however high it is', () => {
  // 62 is above what the entry endpoint takes, and it is what the school
  // holds — an uploaded sheet sums three exam columns into it.
  const rows = sheetRows(STUDENTS, HELD, 1, {})
  assert.equal(rows[0].exam, '62')
  assert.equal(rows[0].problem, '')
})

test('a mark above the cap is named rather than sent', () => {
  const rows = sheetRows(STUDENTS, HELD, 1, { '1|10': { ca: '41' }, '1|16': { exam: '61' } })
  assert.match(rows[0].problem, /CA is above the 40/)
  assert.match(rows[1].problem, /Exam is above the 60/)
  assert.deepEqual(changedMarks(rows, 1, TERM), [])
})

test('only the changed rows are filed, each with the term they belong to', () => {
  const rows = sheetRows(STUDENTS, HELD, 1, { '1|16': { ca: '9', exam: '50' } })
  assert.deepEqual(changedMarks(rows, 1, TERM), [
    { student_id: 16, subject_id: 1, session_id: 8, semester_id: 1, ca: 9, exam: 50 },
  ])
})

test('the button counts the mark in flight, not the ones already done', () => {
  // Filing is one write per mark, so a class of thirty is thirty round trips.
  // The reader wants to know which one is going now.
  assert.equal(saveLabel({ done: 0, total: 30 }, 30), 'Saving 1 of 30')
  assert.equal(saveLabel({ done: 12, total: 30 }, 30), 'Saving 13 of 30')
})

test('the last mark does not read “31 of 30”', () => {
  // `done` reaches the total on the final step, and a count past its own
  // total is the kind of thing that makes somebody distrust the whole screen.
  assert.equal(saveLabel({ done: 30, total: 30 }, 30), 'Saving 30 of 30')
})

test('one mark is not a count worth reading', () => {
  // There is no progress to follow through a single step.
  assert.equal(saveLabel({ done: 0, total: 1 }, 1), 'Saving…')
})

test('idle, the button says how much is waiting to be filed', () => {
  assert.equal(saveLabel(null, 0), 'Save marks')
  assert.equal(saveLabel(null, 1), 'Save 1 mark')
  assert.equal(saveLabel(null, 7), 'Save 7 marks')
})
