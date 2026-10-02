import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Quiz } from '../../../api/quizzes/types.ts'
import { quizRows, quizTally, stateOf } from './quiz-row.ts'

/** Quiz 13 as the school's document shows it, just set. */
const DRAFT: Quiz = {
  id: 13,
  name: 'Week 4 mental maths 4',
  description: 'Ten minutes, no calculators.',
  subject: 'ENGLISH LANGUAGE',
  subject_id: 1,
  class: 'JSS I',
  department_id: 1,
  class_arm_id: null,
  teacher_id: 2,
  status: 'draft',
  duration_minutes: 10,
  total_marks: 0,
  pass_mark_percent: 50,
  asks: 10,
  shuffled: false,
  opens: '2026-10-02 08:00',
  closes: '2026-10-04 00:00',
  marked_automatically: true,
}

const NOW = new Date('2026-10-02T09:00:00').getTime()

test('a draft is a draft whatever its dates say — publishing is its own step', () => {
  assert.equal(stateOf(DRAFT, NOW), 'Draft')
})

test('a published quiz is open, coming or over by its window', () => {
  assert.equal(stateOf({ ...DRAFT, status: 'active' }, NOW), 'Open')
  assert.equal(stateOf({ ...DRAFT, status: 'active', opens: '2026-10-03 08:00' }, NOW), 'Not open yet')
  assert.equal(stateOf({ ...DRAFT, status: 'active', closes: '2026-10-01 08:00' }, NOW), 'Closed')
  assert.equal(stateOf({ ...DRAFT, status: 'closed' }, NOW), 'Closed')
})

test('a row reads the quiz as a teacher would say it, and carries what the form opens on', () => {
  const [row] = quizRows([DRAFT], NOW)
  assert.equal(row.name, 'Week 4 mental maths 4')
  assert.equal(row.clock, '10 minutes')
  assert.equal(row.pass, '50%')
  assert.equal(row.asks, '10 questions')
  assert.equal(row.arms, 'Every arm')
  assert.equal(row.duration, '10')
  assert.equal(row.pass_mark, '50')
  assert.equal(row.shuffled, 'no')
  assert.equal(row.opens_at, '2026-10-02T08:00')
  assert.equal(row.closes_at, '2026-10-04T00:00')
})

test('no clock and no pass mark read as such, not as zero', () => {
  const [row] = quizRows([{ ...DRAFT, duration_minutes: null, pass_mark_percent: null, asks: null }], NOW)
  assert.equal(row.clock, 'No clock')
  assert.equal(row.pass, 'None')
  assert.equal(row.asks, 'Every question')
})

test('drafts first, then open, then what is over; the tiles count them', () => {
  const rows = quizRows(
    [
      { ...DRAFT, id: 1, status: 'closed' },
      { ...DRAFT, id: 2, status: 'active' },
      { ...DRAFT, id: 3 },
    ],
    NOW,
  )
  assert.deepEqual(rows.map((row) => row.id), ['3', '2', '1'])
  assert.deepEqual(quizTally(rows), { quizzes: 3, open: 1, drafts: 1 })
})
