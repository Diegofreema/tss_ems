import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AssignmentQuestion } from '../../../../api/set-assignments/types.ts'
import {
  blankQuestion,
  correctAnswer,
  correctIndex,
  NO_ANSWER,
  questionBody,
  questionReview,
  questionValues,
  type QuestionValues,
  totalMarks,
  typeLabel,
} from './question.ts'

/** Question 37 as `GET /setassignments/35/questions` sends it. */
const QUESTION: AssignmentQuestion = {
  id: 37,
  question_text: 'What is 2 + 2?',
  question_type: 'multiple_choice',
  points: 5,
  order_number: 1,
  difficulty_level: 'medium',
  options: [
    { id: 80, option_text: '3', is_correct: false },
    { id: 81, option_text: '4', is_correct: true },
    { id: 82, option_text: '5', is_correct: false },
  ],
}

test('the answer key is read off the option the school marked', () => {
  assert.equal(correctAnswer(QUESTION), '4')
  assert.equal(correctAnswer({ ...QUESTION, options: [] }), null)
})

test('an assignment is worth what its questions are worth', () => {
  assert.equal(totalMarks([QUESTION, { ...QUESTION, id: 38, points: 3 }]), 8)
  // A question the school stored without points is worth none, not NaN.
  assert.equal(totalMarks([{ ...QUESTION, points: null }]), 0)
})

test('a question opens for editing on the option that was right', () => {
  const values = questionValues(QUESTION)
  assert.equal(values.question_text, 'What is 2 + 2?')
  assert.equal(values.points, '5')
  assert.equal(values.correct, '1')
  assert.deepEqual(values.options, [
    { option_text: '3' },
    { option_text: '4' },
    { option_text: '5' },
  ])
})

test('a multiple-choice question with no options still opens on a pair of boxes', () => {
  const values = questionValues({ ...QUESTION, options: [] })
  assert.equal(values.options.length, 2)
  // And on no answer: the school marked none, so neither does the form.
  assert.equal(values.correct, NO_ANSWER)
})

test('a new question opens with no choice marked as the answer', () => {
  // The first choice used to be marked before the teacher had typed one, so a
  // question written without touching the radio was filed with an answer key
  // nobody chose.
  assert.equal(blankQuestion().correct, NO_ANSWER)
  assert.equal(correctIndex(NO_ANSWER), null)
  assert.equal(correctIndex('   '), null)
  assert.equal(correctIndex('0'), 0)
  assert.equal(correctIndex('2'), 2)
  // Anything that is not a position is nothing marked, never position nought.
  assert.equal(correctIndex('first'), null)
  assert.equal(correctIndex('-1'), null)
})

test('with nothing marked, no option is sent as the right one', () => {
  // The form refuses to submit before a choice is marked, so this is the
  // belt-and-braces: `Number('')` is 0, and the first choice must not become
  // the answer key by arithmetic.
  const body = questionBody({
    ...blankQuestion(),
    question_text: 'Pick one',
    options: [{ option_text: 'a' }, { option_text: 'b' }],
  })
  assert.deepEqual(body.options, [{ option_text: 'a' }, { option_text: 'b' }])
})

test('what is sent back marks the right option and only that one', () => {
  assert.deepEqual(questionBody(questionValues(QUESTION)), {
    question_text: 'What is 2 + 2?',
    question_type: 'multiple_choice',
    points: 5,
    options: [
      { option_text: '3' },
      { option_text: '4', is_correct: true },
      { option_text: '5' },
    ],
  })
})

test('a blank choice is left out, and the answer keeps its place', () => {
  const body = questionBody({
    ...blankQuestion(),
    question_text: 'Pick one',
    options: [{ option_text: 'a' }, { option_text: '  ' }, { option_text: 'c' }],
    correct: '2',
  })
  assert.deepEqual(body.options, [
    { option_text: 'a' },
    { option_text: 'c', is_correct: true },
  ])
})

test('a theory question sends no options at all', () => {
  const body = questionBody({
    ...blankQuestion(),
    question_text: 'Explain photosynthesis.',
    question_type: 'theory',
    points: '10',
  })
  assert.deepEqual(body, {
    question_text: 'Explain photosynthesis.',
    question_type: 'theory',
    points: 10,
  })
})

test('an unrecognised kind reads as the kind every assignment has held', () => {
  assert.equal(typeLabel('theory'), 'Theory')
  assert.equal(typeLabel(null), 'Multiple choice')
})

/** A question part-written in the form: one choice still blank, "Manure" ticked. */
const TYPED: QuestionValues = {
  question_text: '  What is soil fertility?  ',
  question_type: 'multiple_choice',
  points: '3',
  options: [{ option_text: 'Soil' }, { option_text: '   ' }, { option_text: 'Manure' }],
  correct: '2',
}

test('the read-back is what will be sent, not what is in the form', () => {
  const review = questionReview(TYPED)
  // The blank choice is dropped on the way out, so it is not read back either.
  assert.deepEqual(review.choices.map((choice) => choice.text), ['Soil', 'Manure'])
  assert.equal(review.question, 'What is soil fertility?')
  assert.equal(review.points, 3)
  assert.equal(review.kind, 'Multiple choice')
})

test('the read-back ticks the choice the school will mark right', () => {
  // "Manure" is index 2 in the form and index 1 in the body once the blank has
  // gone. A read-back off the form's own values would tick the wrong line.
  const ticked = questionReview(TYPED).choices.filter((choice) => choice.correct)
  assert.deepEqual(ticked.map((choice) => choice.text), ['Manure'])
})

test('a theory question is read back with no choices at all', () => {
  const review = questionReview({ ...TYPED, question_type: 'theory' })
  assert.deepEqual(review.choices, [])
  assert.equal(review.kind, 'Theory')
  assert.match(review.marking, /you mark this one yourself/i)
})

test('with no answer marked, the read-back ticks nothing', () => {
  const review = questionReview({ ...TYPED, correct: NO_ANSWER })
  assert.equal(review.choices.some((choice) => choice.correct), false)
})

test('the read-back reads points through the same filter the body does', () => {
  assert.equal(questionReview({ ...TYPED, points: '4kg' }).points, 4)
  assert.equal(questionReview({ ...TYPED, points: '' }).points, 0)
})
