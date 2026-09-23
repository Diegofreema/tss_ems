import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TeacherDashboard } from '../../../../api/teaching/types.ts'
import {
  armRows,
  assignmentEntries,
  isOpen,
  teacherFigures,
  teacherNote,
} from './dashboard.ts'

/** Verbatim from GET /teachers/me/dashboard, trimmed to what the page reads. */
const DASHBOARD = {
  stats: {
    my_students: 2,
    total_students: 5,
    my_subjects: 3,
    pending_assignments: 0,
    attendance_taken_today: false,
  },
  recent_assignments: [
    {
      id: 6,
      title: 'Simple additions',
      total_questions: 4,
      // No zone on the closing time; the school's own clock, as everywhere.
      closedate: '2026-08-28T10:08',
      opendate: '2026-08-27T10:03:00+01:00',
      status: 'active',
      subject: { id: 2, name: 'MATHEMATICS', subjectcode: 'MATH' },
    },
    {
      id: 5,
      title: 'new assignment reading',
      total_questions: 10,
      closedate: '2026-08-29T09:52',
      opendate: '2026-08-27T09:52:00+01:00',
      status: 'active',
      subject: { id: 1, name: 'ENGLISH LANGUAGE', subjectcode: 'EL' },
    },
  ],
  class_arms: [
    {
      id: 3,
      arm_name: 'JSS1 A',
      department: { id: 1, name: 'JSS 1', deptcode: 'JSS 1' },
    },
  ],
} as unknown as TeacherDashboard

const AFTER = new Date('2026-08-31T08:00:00+01:00')
const BEFORE = new Date('2026-08-28T08:00:00+01:00')

test('the counters read the school off the record', () => {
  const [students, subjects, arms, assignments] = teacherFigures(DASHBOARD)
  assert.equal(students.amount, 2)
  assert.equal(students.delta, 'Of 5 in the school')
  assert.equal(subjects.amount, 3)
  assert.equal(arms.amount, 1)
  assert.equal(arms.delta, 'JSS1 A')
  assert.equal(assignments.amount, 0)
  assert.equal(assignments.hot, false)
})

test('a teacher with nothing assigned is told so rather than shown a blank', () => {
  const [, subjects, arms] = teacherFigures({
    ...DASHBOARD,
    stats: { ...DASHBOARD.stats, my_subjects: 0 },
    class_arms: [],
  })
  assert.equal(subjects.delta, 'None assigned yet')
  assert.match(arms.delta, /Not a class teacher/)
})

test('the line under the greeting leads on attendance', () => {
  assert.match(teacherNote(DASHBOARD.stats), /has not been taken yet/)
  assert.match(
    teacherNote({ ...DASHBOARD.stats, attendance_taken_today: true }),
    /attendance is in/,
  )
})

test('one open assignment is counted in the singular', () => {
  assert.match(
    teacherNote({ ...DASHBOARD.stats, pending_assignments: 1 }),
    /1 of your assignments is still open/,
  )
  assert.match(
    teacherNote({ ...DASHBOARD.stats, pending_assignments: 3 }),
    /3 of your assignments are still open/,
  )
})

test('an assignment is open or shut by its closing time, not by its status', () => {
  const [maths] = DASHBOARD.recent_assignments
  // The row still says 'active' three days after it shut.
  assert.equal(maths.status, 'active')
  assert.equal(isOpen(maths, AFTER), false)
  assert.equal(isOpen(maths, BEFORE), true)
})

test('an assignment with no closing time is left open rather than shut', () => {
  assert.equal(isOpen({ ...DASHBOARD.recent_assignments[0], closedate: null }, AFTER), true)
})

test('each assignment carries its subject, its size and when it shuts', () => {
  const [maths] = assignmentEntries(DASHBOARD.recent_assignments, AFTER)
  assert.equal(maths.text, 'Simple additions')
  assert.equal(maths.who, 'MATHEMATICS · 4 questions')
  assert.match(maths.when, /^Closed 28 Aug 2026/)
  assert.equal(maths.flagged, false)

  const [open] = assignmentEntries(DASHBOARD.recent_assignments, BEFORE)
  assert.match(open.when, /^Closes 28 Aug 2026/)
  assert.equal(open.flagged, true)
})

test('the arms are listed against the class each belongs to', () => {
  assert.deepEqual(armRows(DASHBOARD.class_arms), [
    { label: 'JSS1 A', value: 'JSS 1' },
  ])
})
