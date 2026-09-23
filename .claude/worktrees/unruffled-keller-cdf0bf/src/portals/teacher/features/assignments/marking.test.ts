import assert from 'node:assert/strict'
import { test } from 'node:test'
import type {
  AssignmentSubmission,
  MarkingAnswer,
} from '../../../../api/set-assignments/types.ts'
import {
  answerKey,
  choiceCount,
  chosenOption,
  correctOption,
  gradeBody,
  maxTotal,
  needsHand,
  openingScore,
  openingScores,
  rightCount,
  runningTotal,
  stateOf,
  submissionRows,
  wasRight,
} from './marking.ts'

/**
 * Every fixture below is bronze's own answer, copied from what
 * `/setassignments/35/submissions` and `/setassignments/submissions/36` sent
 * on 2 Sep 2026 — not from the shapes the school's notes described, which
 * disagreed with the server on nearly every field.
 */

/** A row of `GET /setassignments/{id}/submissions`. */
const SUBMITTED: AssignmentSubmission = {
  assignment_id: 36,
  graded: false,
  regno: 'NETPRO/2026/3',
  status: 'submitted',
  student: 'OBILO AJASINA',
  student_id: 3,
  submitted: '9/2/26, 5:56 PM',
  total_score: null,
}

/** A right answer, as the marking view sends it. */
const RIGHT: MarkingAnswer = {
  answer_id: 40,
  question_id: 37,
  question: 'What is the Sun',
  question_type: 'multiple_choice',
  points: 1,
  score: null,
  theory_answer: null,
  options: [
    { id: 80, option_text: 'A Star', is_correct: true, chosen: true },
    { id: 81, option_text: 'A moon', is_correct: false, chosen: false },
    { id: 82, option_text: 'A Sun', is_correct: false, chosen: false },
  ],
}

/** A wrong one, from the same submission. */
const WRONG: MarkingAnswer = {
  answer_id: 42,
  question_id: 39,
  question: 'Another Question',
  question_type: 'multiple_choice',
  points: 1,
  score: null,
  theory_answer: null,
  options: [
    { id: 88, option_text: 'What is the question', is_correct: false, chosen: true },
    { id: 89, option_text: 'This is the question', is_correct: true, chosen: false },
  ],
}

const WRITTEN: MarkingAnswer = {
  answer_id: 43,
  question_id: 40,
  question: 'Explain osmosis in your own words.',
  question_type: 'theory',
  points: 10,
  score: null,
  theory_answer: 'Water moves through a membrane to where there is less water.',
  options: [],
}

test('a submission is identified by the id the school calls `assignment_id`', () => {
  // Assignment 35's submission is 36: it is the submission's id, not the
  // assignment's, and reading it as `id` is what sent the marking page to
  // `?submission=undefined`.
  const [row] = submissionRows([SUBMITTED])
  assert.equal(row.id, '36')
})

test('the pupil is a name and an admission number, flat on the row', () => {
  const [row] = submissionRows([SUBMITTED])
  assert.equal(row.name, 'OBILO AJASINA')
  assert.equal(row.adm, 'NETPRO/2026/3')
  // Nameless is still openable, by whichever id the row does carry.
  assert.equal(submissionRows([{ assignment_id: 44, student_id: 9 }])[0].name, 'Pupil 9')
})

test('the submitted stamp is read back onto the format every other date uses', () => {
  assert.equal(submissionRows([SUBMITTED])[0].submitted, '02 Sept 2026, 17:56')
  // Anything that will not parse is shown exactly as the school sent it.
  assert.equal(
    submissionRows([{ ...SUBMITTED, submitted: 'just now' }])[0].submitted,
    'just now',
  )
})

test('marked is `graded`, and a total on its own where there is no flag', () => {
  assert.equal(stateOf(SUBMITTED), 'To mark')
  assert.equal(stateOf({ ...SUBMITTED, graded: true }), 'Marked')
  const { graded: _flag, ...noFlag } = SUBMITTED
  assert.equal(stateOf({ ...noFlag, total_score: 3 }), 'Marked')
  assert.equal(stateOf(noFlag), 'To mark')
})

test('what still needs marking comes first', () => {
  const rows = submissionRows([
    { ...SUBMITTED, assignment_id: 50, graded: true },
    { ...SUBMITTED, assignment_id: 51 },
  ])
  assert.deepEqual(rows.map((row) => row.id), ['51', '50'])
})

test('a mark is sent against the answer, never against the question', () => {
  assert.equal(answerKey(RIGHT), '40')
  assert.notEqual(answerKey(RIGHT), String(RIGHT.question_id))
})

test('what was picked and what was right are read off the options themselves', () => {
  assert.equal(chosenOption(RIGHT), 'A Star')
  assert.equal(correctOption(RIGHT), 'A Star')
  assert.equal(chosenOption(WRONG), 'What is the question')
  assert.equal(correctOption(WRONG), 'This is the question')
  assert.equal(wasRight(RIGHT), true)
  assert.equal(wasRight(WRONG), false)
})

test('an unanswered choice is not a wrong one, and neither is a written answer', () => {
  const skipped = { ...RIGHT, options: RIGHT.options?.map((o) => ({ ...o, chosen: false })) }
  assert.equal(wasRight(skipped), null)
  assert.equal(wasRight(WRITTEN), null)
  assert.equal(chosenOption(skipped), '')
})

test('the sheet proposes the multiple-choice marks and asks for the rest', () => {
  // The school scores nothing: every answer came back null. The key it does
  // send is enough to fill the choice in, and a written answer is nobody's to
  // guess at.
  assert.equal(openingScore(RIGHT), '1')
  assert.equal(openingScore(WRONG), '0')
  assert.equal(openingScore(WRITTEN), '')
  // A mark already given is what it opens on, whatever the key says.
  assert.equal(openingScore({ ...WRONG, score: 1 }), '1')
})

test('the totals count every answer, and the tiles count the choices', () => {
  const answers = [RIGHT, WRONG, WRITTEN]
  assert.equal(maxTotal(answers), 12)
  assert.equal(rightCount(answers), 1)
  assert.equal(choiceCount(answers), 2)
  assert.deepEqual(needsHand(answers), [WRITTEN])
  assert.equal(runningTotal(answers, openingScores(answers)), 1)
  assert.equal(runningTotal(answers, { ...openingScores(answers), '43': '7' }), 8)
})

test('the sheet sends a mark for every answer, the choices included', () => {
  const answers = [RIGHT, WRONG, WRITTEN]
  assert.deepEqual(
    gradeBody({
      answers,
      scores: { ...openingScores(answers), '43': '7' },
      comment: '  Good work.  ',
      marked: false,
    }),
    // An answer left out of `scores` is an answer left unmarked, because
    // nothing on this server scores one on its own.
    { scores: { '40': 1, '42': 0, '43': 7 }, comment: 'Good work.' },
  )
})

test('a correction says it is one, and an empty box is nought given', () => {
  assert.deepEqual(
    gradeBody({ answers: [WRITTEN], scores: { '43': '' }, comment: ' ', marked: true }),
    { scores: { '43': 0 }, regrade: true },
  )
})
