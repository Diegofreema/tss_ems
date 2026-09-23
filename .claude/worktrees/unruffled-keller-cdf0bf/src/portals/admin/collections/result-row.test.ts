import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Mark } from '../../../api/results/types.ts'
import {
  batchesOf,
  batchId,
  batchRow,
  correctBody,
  deletable,
  enterBody,
  markRow,
  markState,
  parseBatchId,
  partsTotal,
  pupilName,
} from './result-row.ts'

/**
 * Built from the two shapes that describe this table and have been seen
 * filled in: `ChildResult` off the guardian's endpoint carries `first_ca`,
 * `second_ca` and `first_exam`, and `TeacherResult` carries the rest.
 */
const MARK: Mark = {
  id: 91,
  student_id: 483,
  subject_id: 1,
  regno: 'NP/2025/001',
  first_ca: '15.00',
  second_ca: '10.00',
  homework_project: '5.00',
  first_exam: '55.00',
  total: '85.00',
  grade: 'A',
  remark: 'Excellent',
  approval_status: 'pending',
  uploaddate: '2026-08-27T11:14:47+01:00',
  subject: { id: 1, name: 'ENGLISH LANGUAGE' },
  department: { id: 1, name: 'JSS 1' },
  semester: { id: 1, name: 'First Term' },
  session: { id: 8, name: '2025/2026' },
  student: { id: 483, fname: 'Ada', lname: 'Obi', regno: 'NP/2025/001' },
  user: { id: 2, fname: 'Grace', lname: 'Ede' },
}

test('a mark reads as the register shows it, with the parts held back', () => {
  const row = markRow(MARK)
  assert.equal(row.id, '91')
  assert.equal(row.name, 'Ada Obi')
  assert.equal(row.subject, 'ENGLISH LANGUAGE')
  assert.equal(row.klass, 'JSS 1')
  assert.equal(row.total, '85')
  assert.equal(row.grade, 'A')
  assert.equal(row.state, 'Pending')
  // The four parts are on the record panel; a register of eight numeric
  // columns is a spreadsheet.
  assert.equal(row.firstCa, '15')
  assert.equal(row.homework, '5')
  assert.equal(row.by, 'Grace Ede')
})

test('the decimal nothings come off, and an unreadable mark is no mark', () => {
  assert.equal(markRow({ ...MARK, total: '85.50' }).total, '85.5')
  // Not the raw text either: a mark that cannot be read as a number is no
  // mark, and the shared reader is what every other sheet in the app uses.
  assert.equal(markRow({ ...MARK, total: 'n/a' }).total, '—')
  // Not a nought: nobody should read "no mark yet" as a score of zero.
  assert.equal(markRow({ ...MARK, total: null }).total, '—')
})

test('a pupil with no name falls back to something that identifies them', () => {
  assert.equal(pupilName({ ...MARK, student: null }), 'NP/2025/001')
  assert.equal(pupilName({ ...MARK, student: null, regno: null }), 'Pupil 483')
})

test('the office’s three words cover whatever the column holds', () => {
  assert.equal(markState('approved'), 'approved')
  assert.equal(markState('REJECTED'), 'rejected')
  // The API's own word for it in one place and not another.
  assert.equal(markState('declined'), 'rejected')
  assert.equal(markState(null), 'pending')
  assert.equal(markRow({ ...MARK, approval_status: 'rejected' }).state, 'Sent back')
})

test('a released mark offers no delete, because the API answers 409', () => {
  assert.equal(deletable(markRow(MARK)), true)
  assert.equal(deletable(markRow({ ...MARK, approval_status: 'approved' })), false)
})

/* Batches. */

test('a batch key survives the trip through a row id', () => {
  const key = { subject_id: 10, department_id: 1, semester_id: 1, session_id: 8 }
  assert.equal(batchId(key), '10-1-1-8')
  assert.deepEqual(parseBatchId('10-1-1-8'), key)
})

test('a row id that is not a batch key is refused rather than half-read', () => {
  // Releasing a batch on a guessed id would sign off somebody else's marks.
  assert.equal(parseBatchId('10-1-1'), undefined)
  assert.equal(parseBatchId('10-1-1-x'), undefined)
  assert.equal(parseBatchId('10-1-1-0'), undefined)
})

test('a batch is read for its four ids whether they arrive bare or expanded', () => {
  const bare = batchRow({
    subject_id: 10,
    department_id: 1,
    semester_id: 1,
    session_id: 8,
    subject_name: 'MATHEMATICS',
    total: 30,
  })
  assert.equal(bare.id, '10-1-1-8')
  assert.equal(bare.subject, 'MATHEMATICS')
  assert.equal(bare.marks, '30')

  const expanded = batchRow({
    subject: { id: 10, name: 'MATHEMATICS' },
    department: { id: 1, name: 'JSS 1' },
    semester: { id: 1, name: 'First Term' },
    session: { id: 8, name: '2025/2026' },
  } as never)
  assert.equal(expanded.id, '10-1-1-8')
  assert.equal(expanded.klass, 'JSS 1')
})

test('the batches are found whichever key the queue carries them under', () => {
  assert.deepEqual(batchesOf({ batches: [{ subject_id: 1 }] }), [{ subject_id: 1 }])
  assert.deepEqual(batchesOf({ rows: [{ subject_id: 2 }], total: 1 }), [{ subject_id: 2 }])
  assert.deepEqual(batchesOf(undefined), [])
  assert.deepEqual(batchesOf({ total: 0 }), [])
})

/* Writing. */

test('entering a mark sends the four parts and never the arithmetic', () => {
  const body = enterBody({
    student_id: '483',
    subject_id: '1',
    first_ca: '15',
    second_ca: '10',
    homework_project: '5',
    first_exam: '55',
    // A form that somehow held these must not send them: the total is the
    // school's arithmetic and the grade is the school's scale.
    total: '85',
    grade: 'A',
  })
  assert.deepEqual(body, {
    student_id: 483,
    subject_id: 1,
    first_ca: 15,
    second_ca: 10,
    homework_project: 5,
    first_exam: 55,
  })
})

test('a correction leaves out what was not filled in', () => {
  // The endpoint keeps whatever it is not sent, so an empty box must not
  // travel as a nought and zero a CA nobody touched.
  assert.deepEqual(correctBody({ first_exam: '40', second_ca: '' }), { first_exam: 40 })
  assert.deepEqual(correctBody({}), {})
  // The pupil and the subject are never resent: a mark against the wrong
  // pupil is deleted, not reassigned.
  assert.deepEqual(correctBody({ student_id: '9', first_ca: '1' }), { first_ca: 1 })
})

test('the form can add the parts up before the API does', () => {
  assert.equal(partsTotal({ first_ca: '15', second_ca: '10', homework_project: '5', first_exam: '55' }), 85)
  assert.equal(partsTotal({ first_ca: '', first_exam: '40' }), 40)
  assert.equal(partsTotal({}), 0)
})
