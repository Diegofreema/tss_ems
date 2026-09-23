import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AssignmentResult, Question } from '../../../../api/assignments/types.ts'
import { answerRows, isScored, resultFields, scoreHeadline, scoreNote } from './result.ts'

/** Submission 18 as `GET /assignments/results/18` sends it: nothing recorded. */
const UNMARKED: AssignmentResult = {
  assignment: {
    id: 18,
    title: 'Simple additions',
    subject: 'MATHEMATICS',
    status: 'submitted',
    start_time: '2026-08-27T10:00:00+01:00',
    end_time: '2026-08-27T13:59:07+01:00',
    duration: '03:59:07',
    is_graded: false,
    teacher_comments: null,
  },
  student: { id: 4, regno: 'CUN/2026/4', name: 'UDOYE OKIGBO' },
  score: { total_questions: 0, correct_answers: 0, total_score: 0, max_points: 0, percentage: 0 },
  answers: [],
}

/** Submission 11, which does carry marks. */
const MARKED: AssignmentResult = {
  assignment: {
    id: 11,
    title: 'new assignment reading',
    subject: 'ENGLISH LANGUAGE',
    duration: '00:00:49',
    is_graded: false,
  },
  score: { total_questions: 4, correct_answers: 3, total_score: 15, max_points: 20, percentage: 75 },
  answers: [
    {
      question_id: 5,
      question_text: 'who is the governor of imo state',
      question_type: 'multiple_choice',
      points: 5,
      selected_option_id: 11,
      theory_answer: null,
      is_correct: true,
    },
    {
      question_id: 8,
      question_text: 'Where is Imo state located?',
      question_type: 'multiple_choice',
      points: 5,
      selected_option_id: 25,
      theory_answer: null,
      is_correct: false,
    },
  ],
}

const QUESTIONS: Question[] = [
  {
    id: 5,
    question_type: 'multiple_choice',
    options: [
      { id: 11, option_text: 'Hope Uzodinma' },
      { id: 12, option_text: 'Rochas Okorocha' },
    ],
  },
]

test('nothing scored is said in words — never as a mark of zero', () => {
  assert.equal(isScored(UNMARKED), false)
  assert.equal(scoreHeadline(UNMARKED), 'Not marked yet')
  assert.match(scoreNote(UNMARKED), /has not marked this assignment/)
  assert.doesNotMatch(scoreNote(UNMARKED), /0 of 0/)
})

test('a scored assignment reports its percentage and what it is out of', () => {
  assert.equal(scoreHeadline(MARKED), '75%')
  assert.match(scoreNote(MARKED), /^15 of 20 marks, from 3 of 4 questions\./)
})

test('ungraded means the written answers are still out, so the mark can rise', () => {
  assert.match(scoreNote(MARKED), /still with your teacher/)
  assert.doesNotMatch(
    scoreNote({ ...MARKED, assignment: { id: 11, is_graded: true } }),
    /still with your teacher/,
  )
})

test('the slip reads the school clock and says who has still to look', () => {
  const fields = Object.fromEntries(resultFields(UNMARKED).map((one) => [one.label, one.value]))
  assert.equal(fields.Assignment, 'Simple additions')
  assert.equal(fields.Started, '27 Aug 2026, 10:00')
  assert.equal(fields.Submitted, '27 Aug 2026, 13:59')
  assert.equal(fields.Took, '03:59:07')
  assert.equal(fields['Marked by a teacher'], 'Not yet')
  assert.equal(fields["Teacher's note"], '—')
})

test('an option id is shown as the option, read off the assignment', () => {
  const [right, wrong] = answerRows(MARKED, QUESTIONS)
  assert.equal(right.answer, 'Hope Uzodinma')
  assert.equal(right.verdict, 'Correct')
  assert.equal(right.worth, '5')
  // Question 8's options were not on the assignment handed in, so the id stands.
  assert.equal(wrong.answer, 'Option 25')
  assert.equal(wrong.verdict, 'Wrong')
})

test('an answer nobody has read is not marked, which is not the same as wrong', () => {
  const [row] = answerRows(
    {
      answers: [
        { question_id: 9, question_text: 'Summarise it.', theory_answer: 'Chapter 4 is…', is_correct: null, points: 10 },
      ],
    },
    [],
  )
  assert.equal(row.verdict, 'Not marked')
  assert.equal(row.answer, 'Chapter 4 is…')
})

test('a question skipped altogether says so rather than showing an id', () => {
  const [row] = answerRows({ answers: [{ question_id: 3, selected_option_id: null }] }, [])
  assert.equal(row.answer, 'Left blank')
})

test('a submission with no answers recorded produces no rows', () => {
  assert.deepEqual(answerRows(UNMARKED, []), [])
  assert.deepEqual(answerRows(undefined, []), [])
})
