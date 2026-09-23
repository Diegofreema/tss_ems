import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Assignment } from '../../../../api/set-assignments/types.ts'
import { assignmentBody } from '../../collections/assignment-body.ts'
import { assignmentRows, stateOf } from '../../collections/assignment-row.ts'
import {
  blankQuestion,
  correctAnswer,
  questionBody,
  questionValues,
  totalMarks,
} from './question.ts'

/**
 * One assignment through the teacher's hands: set it, correct it, write its
 * questions, correct one of those.
 *
 * Each step is checked against the body the school documents and the payload
 * it answers with — never against what the step before it produced — so a
 * change that moves two of them together still has to answer to both.
 *
 * Marking is not here: it needs a pupil to have submitted, and no submission
 * has ever been seen from this server.
 */

/** What a teacher fills in, as the form hands the values over. */
const FILLED = {
  title: 'Week 5 class test',
  details: '<p>Answer all questions. <strong>Show your working.</strong></p>',
  subject_id: '2',
  department_id: '6',
  time_limit: '25',
  passing_score: '40',
}

test('setting one sends the body the school documents, and nothing else', () => {
  assert.deepEqual(assignmentBody(FILLED), {
    subject_id: 2,
    department_id: 6,
    title: 'Week 5 class test',
    details: '<p>Answer all questions. <strong>Show your working.</strong></p>',
    test_type: 'cbt_test',
    time_limit: 25,
    passing_score: 40,
  })
})

/**
 * The same assignment as `GET /setassignments` answers with it once it is set:
 * the ids come back as names beside them, the school fills in the closing date
 * this portal never sends, and nothing has been written into it yet.
 */
const JUST_SET: Assignment = {
  id: 36,
  title: 'Week 5 class test',
  details: '<p>Answer all questions. <strong>Show your working.</strong></p>',
  test_type: 'cbt_test',
  subject_id: 2,
  subject: 'MATHEMATICS',
  department_id: 6,
  class: 'SSS I',
  semester_id: 1,
  semester: 'First Term',
  teacher_id: 7,
  status: 'active',
  opendate: null,
  closedate: '2026-09-09 14:57:53',
  time_limit: 25,
  passing_score: 40,
  total_questions: 0,
}

const NOW = new Date('2026-09-02T09:00:00').getTime()

test('a newly set assignment reads as one still waiting on its questions', () => {
  const [row] = assignmentRows([JUST_SET], NOW)
  assert.equal(row.state, 'No questions')
  // What was typed into the form is what the teacher is shown back.
  assert.equal(row.title, 'Week 5 class test')
  assert.equal(row.minutes, '25 minutes')
  assert.equal(row.pass, '40%')
  assert.equal(row.questions, '0')
  // The names the school put to the two ids that were submitted.
  assert.equal(row.subject, 'MATHEMATICS')
  assert.equal(row.klass, 'SSS I')
})

test('correcting one edits the row it was read from, and keeps its status', () => {
  // The edit form opens on the row, so the row has to carry every key the
  // body is built from — an id missing here is an assignment saved against no
  // subject at all, which the form has no way of noticing.
  const [row] = assignmentRows([JUST_SET], NOW)
  const edited = { ...row, title: 'Week 5 class test (moved to Friday)' }

  assert.deepEqual(assignmentBody(edited, row.status), {
    subject_id: 2,
    department_id: 6,
    title: 'Week 5 class test (moved to Friday)',
    details: '<p>Answer all questions. <strong>Show your working.</strong></p>',
    test_type: 'cbt_test',
    time_limit: 25,
    passing_score: 40,
    // Sent back as the school holds it. Nothing in this portal sets a status,
    // and the update body carries one.
    status: 'active',
  })
})

test('writing the first question sends what the school asks for', () => {
  const body = questionBody({
    ...blankQuestion(),
    question_text: 'What is 2 + 2?',
    points: '5',
    options: [{ option_text: '3' }, { option_text: '4' }, { option_text: '5' }],
    correct: '1',
  })

  assert.deepEqual(body, {
    question_text: 'What is 2 + 2?',
    question_type: 'multiple_choice',
    points: 5,
    // The right one alone carries the key; the rest are text and nothing more.
    options: [
      { option_text: '3' },
      { option_text: '4', is_correct: true },
      { option_text: '5' },
    ],
  })
})

test('an assignment that holds a question is one a pupil can sit', () => {
  // The school counts the questions itself, so the state moves without this
  // portal being told anything else.
  assert.equal(stateOf(JUST_SET, NOW), 'No questions')
  assert.equal(stateOf({ ...JUST_SET, total_questions: 1 }, NOW), 'Open')
})

/** The question as `GET /setassignments/{id}/questions` sends it back. */
const STORED = {
  id: 37,
  question_text: 'What is 2 + 2?',
  question_type: 'multiple_choice' as const,
  points: 5,
  order_number: 1,
  difficulty_level: 'medium',
  options: [
    { id: 80, option_text: '3', is_correct: false },
    { id: 81, option_text: '4', is_correct: true },
    { id: 82, option_text: '5', is_correct: false },
  ],
}

test('reopening a question and changing only its worth leaves the answer alone', () => {
  const opened = questionValues(STORED)
  const body = questionBody({ ...opened, points: '8' })

  assert.equal(body.points, 8)
  // Still the second option, and still only that one.
  assert.deepEqual(body.options, [
    { option_text: '3' },
    { option_text: '4', is_correct: true },
    { option_text: '5' },
  ])
})

test('moving the answer marks the new one and unmarks the old', () => {
  const body = questionBody({ ...questionValues(STORED), correct: '2' })
  assert.deepEqual(body.options, [
    { option_text: '3' },
    { option_text: '4' },
    { option_text: '5', is_correct: true },
  ])
})

test('the answer key and the total are read back off the stored question', () => {
  assert.equal(correctAnswer(STORED), '4')
  assert.equal(totalMarks([STORED, { id: 38, question_type: 'theory', points: 10 }]), 15)
})
