import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { RegisterStudent } from '../../../../api/attendance/types.ts'
import {
  changedMarks,
  ignoredNote,
  isFuture,
  liveTally,
  missingDays,
  myClassOptions,
  registerRows,
  statusOptions,
  statusTone,
} from './register.ts'

const student = (over: Partial<RegisterStudent> = {}): RegisterStudent => ({
  student_id: 19,
  name: 'OGWA NDU',
  regno: 'NETPRO/2026/19',
  status: null,
  notes: null,
  ...over,
})

test('an unmarked student stays unmarked rather than defaulting to present', () => {
  const [row] = registerRows([student()], {})
  assert.equal(row.status, null)
  assert.equal(row.edited, false)
})

test('a student already marked reads what the school holds', () => {
  const [row] = registerRows([student({ status: 'late', notes: 'Bus was late' })], {})
  assert.equal(row.status, 'late')
  assert.equal(row.notes, 'Bus was late')
  assert.equal(row.edited, false)
})

test('only touched rows are sent, so an untouched student is left alone', () => {
  const rows = registerRows(
    [student(), student({ student_id: 2, name: 'ADA EZE' })],
    { '2': { status: 'absent' } },
  )
  assert.deepEqual(changedMarks(rows), { '2': 'absent' })
})

test('a mark with no note travels as a bare word, one with a note as an object', () => {
  const rows = registerRows([student(), student({ student_id: 2, name: 'ADA EZE' })], {
    '19': { status: 'present' },
    '2': { status: 'late', notes: ' Bus was late ' },
  })
  assert.deepEqual(changedMarks(rows), {
    '19': 'present',
    '2': { status: 'late', notes: 'Bus was late' },
  })
})

test('a note typed against no status is not sent — there is no mark to carry it', () => {
  const rows = registerRows([student()], { '19': { notes: 'Saw them at the gate' } })
  assert.deepEqual(changedMarks(rows), {})
})

test('the tally reads in-school off the statuses, not off the word', () => {
  // The school here says late is NOT in school. The count must follow that,
  // not this module's own reading of the English.
  const statuses = [
    { value: 'present', label: 'Present', inSchool: true, tone: 'good' as const },
    { value: 'late', label: 'Late', inSchool: false, tone: 'warn' as const },
  ]
  const rows = registerRows(
    [student({ status: 'present' }), student({ student_id: 2, name: 'ADA', status: 'late' }), student({ student_id: 3, name: 'OBI' })],
    {},
  )
  const tally = liveTally(rows, statuses)
  assert.equal(tally.inSchool, 1)
  assert.equal(tally.marked, 2)
  assert.equal(tally.unmarked, 1)
  assert.deepEqual(
    tally.byStatus.map((one) => one.count),
    [1, 1],
  )
})

test('statuses come with their in-school list, which late is on', () => {
  const read = statusOptions({
    statuses: ['present', 'absent', 'late', 'excused'],
    counted_as_present: ['present', 'late'],
  })
  assert.deepEqual(
    read.map((one) => [one.value, one.label, one.inSchool]),
    [
      ['present', 'Present', true],
      ['absent', 'Absent', false],
      ['late', 'Late', true],
      ['excused', 'Excused', false],
    ],
  )
})

test('a statuses answer that never arrived still leaves a usable register', () => {
  assert.deepEqual(
    statusOptions(undefined).map((one) => [one.value, one.inSchool]),
    [
      ['present', true],
      ['absent', false],
      ['late', true],
      ['excused', false],
    ],
  )
})

test('an arm is named by its class and its arm, without saying the class twice', () => {
  assert.deepEqual(
    myClassOptions([
      { class_arm_id: 16, arm_name: 'C', department_id: 1, class: 'JSS 1', mine_because: '', pupils: 0 },
      { class_arm_id: 9, arm_name: 'JSS III A', department_id: 5, class: 'JSS III', mine_because: '', pupils: 24 },
    ]),
    [
      { id: 16, label: 'JSS 1 C', roll: 0 },
      { id: 9, label: 'JSS III A', roll: 24 },
    ],
  )
  assert.deepEqual(myClassOptions(undefined), [])
})

test('a date after today is refused before it is sent', () => {
  assert.equal(isFuture('2026-09-02', '2026-09-01'), true)
  assert.equal(isFuture('2026-09-01', '2026-09-01'), false)
  assert.equal(isFuture('2026-08-31', '2026-09-01'), false)
})

test('ignored ids are named, because the saved count will otherwise look short', () => {
  assert.match(
    ignoredNote({ saved: 1, ignored: [2, 3], register: {} as never }),
    /2 student ids were not in this class/,
  )
  assert.equal(ignoredNote({ saved: 1, ignored: [], register: {} as never }), '')
})

test('missing days come back newest first', () => {
  const days = missingDays({
    from: '2026-08-02',
    to: '2026-09-01',
    school_days: 22,
    taken: 1,
    missing: ['2026-08-03', '2026-08-31', '2026-08-14'],
    missing_count: 3,
  })
  assert.deepEqual(
    days.map((day) => day.iso),
    ['2026-08-31', '2026-08-14', '2026-08-03'],
  )
})

test('each of the four marks wears its own colour', () => {
  // The whole point of the change: a teacher standing in front of a class has
  // to see which word is set without reading it.
  assert.deepEqual(
    statusOptions(undefined).map((one) => [one.value, one.tone]),
    [
      ['present', 'good'],
      ['absent', 'bad'],
      ['late', 'warn'],
      ['excused', 'accent'],
    ],
  )
})

test('the colour is read off the word, not off the in-school list', () => {
  // Present and late are both counted as being in school, and they are exactly
  // the two a teacher most needs to tell apart. Grouping by the school's own
  // arithmetic would paint them the same.
  const read = statusOptions({
    statuses: ['present', 'late'],
    counted_as_present: ['present', 'late'],
  })
  assert.deepEqual(read.map((one) => one.tone), ['good', 'warn'])
})

test('a word the school spells its own way is still recognised', () => {
  assert.equal(statusTone('Present'), 'good')
  assert.equal(statusTone('  ABSENT '), 'bad')
})

test('a word nobody here has seen still looks chosen', () => {
  // The catalogue is the school's; it may hold words this file does not know.
  // Brand blue is what the control has always filled with, so an unrecognised
  // mark reads as set rather than as untouched.
  assert.equal(statusTone('suspended'), 'accent')
  assert.equal(statusTone(''), 'accent')
})
