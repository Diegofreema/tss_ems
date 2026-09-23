import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AssignmentDetail, Question } from '../../../../api/assignments/types.ts'
import {
  answeredCount,
  isAnswered,
  isTheory,
  limitSeconds,
  assignmentFields,
  assignmentMeta,
  questionsOf,
  startedAt,
  windowNote,
  submitBody,
  windowProblem,
} from './assignment.ts'

const THEORY: Question = {
  id: 9,
  question_text: 'Summarise chapters 4 and 6.',
  question_type: 'theory',
  points: 10,
  options: [],
}

const CHOICE: Question = {
  id: 5,
  question_text: 'Who is the governor of Imo state?',
  question_type: 'multiple_choice',
  points: 5,
  options: [
    { id: 11, option_text: 'Hope Uzodinma', order_number: 1 },
    { id: 12, option_text: 'Rochas Okorocha', order_number: 2 },
  ],
}

/** Assignment 6 as `GET /assignments/6` actually sends it. */
const ASSIGNMENT: AssignmentDetail = {
  assignment: {
    id: 6,
    title: 'Simple additions',
    subject: 'MATHEMATICS',
    class: 'SSS I',
    opendate: '2026-08-27T10:03:00+01:00',
    closedate: '2026-08-28T10:08',
    time_limit: null,
    total_questions: 4,
    passing_score: 30,
    // All four nulled on this route, whatever the list said.
    question_count: null,
    my_status: null,
    submitted: null,
    window_problem: null,
  },
  window_problem: 'This test has closed.',
  my_submission: { id: 18, status: 'submitted' },
  deadline: null,
  questions: [THEORY],
}

test('the reason an assignment cannot be sat is the sibling, not the nulled copy', () => {
  assert.equal(windowProblem(ASSIGNMENT), 'This test has closed.')
  assert.equal(windowProblem({ ...ASSIGNMENT, window_problem: null }), undefined)
})

test('a question with no options is theory whatever it calls itself', () => {
  assert.equal(isTheory(THEORY), true)
  assert.equal(isTheory(CHOICE), false)
  assert.equal(isTheory({ id: 1, question_type: 'multiple_choice', options: [] }), true)
})

test('whitespace typed into a theory box is not an answer', () => {
  assert.equal(isAnswered({ 9: '   ' }, THEORY), false)
  assert.equal(isAnswered({ 9: 'Chapter 4 is about…' }, THEORY), true)
  assert.equal(isAnswered({}, THEORY), false)
  assert.equal(isAnswered({ 5: 11 }, CHOICE), true)
})

test('answered counts the questions on this assignment, not the keys in the draft', () => {
  // 99 is not on the assignment — a stale key must not inflate the count.
  assert.equal(answeredCount({ 9: 'yes', 99: 3 }, [THEORY, CHOICE]), 1)
})

test('the submitted body is keyed on question ids, trimmed, blanks left out', () => {
  const body = submitBody(
    { 9: '  Chapter 4 is about…  ', 5: 11 },
    [THEORY, CHOICE],
    new Date('2026-08-27T10:00:00'),
  )
  assert.deepEqual(body.answers, { 9: 'Chapter 4 is about…', 5: 11 })
  assert.equal(body.actual_start_time, '2026-08-27T10:00:00')
})

test('a question left blank is absent from the body rather than sent empty', () => {
  const body = submitBody({ 5: 11 }, [THEORY, CHOICE], new Date('2026-08-27T10:00:00'))
  assert.deepEqual(body.answers, { 5: 11 })
})

test('the start time carries the wall clock and no zone', () => {
  // The API keeps the wall clock and discards the offset, so sending one would
  // be sending something thrown away.
  assert.equal(startedAt(new Date('2026-08-27T09:05:03')), '2026-08-27T09:05:03')
  assert.match(startedAt(new Date('2026-01-02T03:04:05')), /^2026-01-02T03:04:05$/)
})

test('an assignment with no time limit runs no clock', () => {
  assert.equal(limitSeconds(ASSIGNMENT), null)
  assert.equal(limitSeconds({ ...ASSIGNMENT, assignment: { id: 6, time_limit: 25 } }), 1500)
})

test('the brief counts the questions sent, since the count field is null here', () => {
  assert.equal(questionsOf(ASSIGNMENT).length, 1)
  assert.equal(assignmentMeta(ASSIGNMENT), 'MATHEMATICS · SSS I · 1 question · no time limit · one attempt')

  const fields = Object.fromEntries(assignmentFields(ASSIGNMENT).map((one) => [one.label, one.value]))
  assert.equal(fields.Questions, '1')
  assert.equal(fields['Time allowed'], 'No limit')
  assert.equal(fields['Pass mark'], '30%')
  assert.equal(fields.Closes, '28 Aug 2026, 10:08')
})

/** An assignment that shuts sooner than its own time limit would run out. */
const CLOSING: AssignmentDetail = {
  assignment: {
    id: 90,
    title: 'Mid Term Test',
    time_limit: 30,
    closedate: '2026-09-23 09:00:00',
  },
  questions: [],
}

const NINE = Date.parse('2026-09-23T09:00:00')

test('a student starting near the close is told the clock is the window, not the limit', () => {
  // The trap this exists for: `attemptExpiry` takes the earlier of the two, so
  // starting ten minutes before the close gives ten minutes — while the terms
  // above still read "Time allowed: 30 minutes".
  const note = windowNote(CLOSING, NINE - 10 * 60_000)
  assert.match(note ?? '', /10 minutes/)
  assert.match(note ?? '', /not 30/)
})

test('a window wider than the time allowed says nothing — the limit is the bound', () => {
  assert.equal(windowNote(CLOSING, NINE - 90 * 60_000), null)
})

test('an assignment with no limit is bounded by its window, and says so', () => {
  const note = windowNote(
    { ...CLOSING, assignment: { ...CLOSING.assignment, time_limit: null } },
    NINE - 45 * 60_000,
  )
  assert.match(note ?? '', /45 minutes/)
  assert.match(note ?? '', /no other time limit/i)
})

test('an hour and a half is said the way somebody would say it', () => {
  const note = windowNote(
    { ...CLOSING, assignment: { ...CLOSING.assignment, time_limit: null } },
    NINE - 90 * 60_000,
  )
  assert.match(note ?? '', /1 hour and 30 minutes/)
})

test('a window already shut says nothing — the school’s own refusal does', () => {
  assert.equal(windowNote(CLOSING, NINE + 60_000), null)
  assert.equal(windowNote(CLOSING, NINE), null)
})

test('an assignment that never shuts has no window note at all', () => {
  assert.equal(
    windowNote({ ...CLOSING, assignment: { ...CLOSING.assignment, closedate: null } }, NINE),
    null,
  )
})
