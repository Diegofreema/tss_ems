import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { QuizQuestion } from '../../../../api/quizzes/types.ts'
import { WRITE } from '../../../../db/ids.ts'
import type { OutboxOp } from '../../../../db/outbox.ts'
import {
  answerText,
  blankQuizQuestion,
  composeQuizQuestions,
  questionRows,
  quizMarks,
  quizQuestionBody,
  quizQuestionProblem,
  quizQuestionValues,
  withLanded,
} from './quiz-question.ts'

/** Question 22 as the school's document shows it. */
const STORED: QuizQuestion = {
  id: 22,
  question: 'What is 7 x 8?',
  question_type: 'multiple_choice',
  mark: 2,
  order: 1,
  options: { '1': '54', '2': '56', '3': '58', '4': '64' },
  correct_option: '2',
  markable: true,
}

test('writing the documented question sends the documented body', () => {
  assert.deepEqual(
    quizQuestionBody(
      {
        question: 'What is 7 x 8?',
        question_type: 'multiple_choice',
        mark: '2',
        options: ['54', '56', '58', '64'],
        correct: '2',
      },
      1,
    ),
    {
      question: 'What is 7 x 8?',
      question_type: 'multiple_choice',
      mark: 2,
      question_order: 1,
      // The option's number, never its text.
      correctans: '2',
      op1: '54',
      op2: '56',
      op3: '58',
      op4: '64',
    },
  )
})

test('a blank box is closed up, and the answer moves with its option', () => {
  const body = quizQuestionBody({
    question: 'Pick one',
    question_type: 'multiple_choice',
    mark: '1',
    options: ['a', '', 'c', 'd'],
    correct: '4',
  })
  assert.equal(body.op1, 'a')
  assert.equal(body.op2, 'c')
  assert.equal(body.op3, 'd')
  assert.equal(body.op4, undefined)
  // `d` was box four and is option three once the hole is gone.
  assert.equal(body.correctans, '3')
})

test('a true/false question sends no options — the school writes its own', () => {
  const body = quizQuestionBody({
    question: 'Seven is prime.',
    question_type: 'true_false',
    mark: '1',
    options: ['x', 'y', '', ''],
    correct: '1',
  })
  assert.deepEqual(body, {
    question: 'Seven is prime.',
    question_type: 'true_false',
    mark: 1,
    correctans: '1',
  })
})

test('the form refuses a question the quiz could not mark', () => {
  const ready = { ...quizQuestionValues(STORED) }
  assert.equal(quizQuestionProblem(ready), null)
  assert.match(quizQuestionProblem({ ...ready, correct: '' }) ?? '', /right/)
  assert.match(quizQuestionProblem({ ...ready, options: ['only', '', '', ''], correct: '1' }) ?? '', /at least 2/)
  assert.match(quizQuestionProblem({ ...ready, question_type: 'true_false', correct: '3' }) ?? '', /true or false/)
  // Nothing preselected: a key nobody chose is a key nobody checked.
  assert.equal(blankQuizQuestion().correct, '')
})

test('a stored question opens back in the form as it was written', () => {
  const values = quizQuestionValues(STORED)
  assert.deepEqual(values.options, ['54', '56', '58', '64'])
  assert.equal(values.correct, '2')
  assert.equal(values.mark, '2')
})

test('the tab reads the answer by its words, and says so where there is none', () => {
  assert.equal(answerText(STORED), '56')
  const [row, unanswered] = questionRows([STORED, { ...STORED, id: 23, order: 2, correct_option: null, markable: false }])
  assert.equal(row.answer, '56')
  assert.equal(unanswered.answer, 'No answer set')
  assert.equal(quizMarks([STORED, { id: 24, mark: 3 }]), 5)
})

const op = (seq: number, handler: string, payload: unknown, targetKey: string | null = null): OutboxOp => ({
  id: `op-${seq}`,
  seq,
  handler,
  payload,
  collectionId: null,
  targetKey,
  dependsOn: [],
  createdAt: 0,
  attempts: 0,
  nextAttemptAt: 0,
  state: 'queued',
  lastError: null,
  toast: { success: '' },
  label: '',
})

test('queued work is written through: a rewrite, a delete and a new question', () => {
  const written: QuizQuestion[] = [STORED, { ...STORED, id: 23, order: 2, question: 'Gone soon' }]
  const composed = composeQuizQuestions(
    written,
    [
      op(1, WRITE.updateQuizQuestion, { quiz_id: '13', question_id: 22, body: { question: 'What is 8 x 7?', mark: 3 } }),
      op(2, WRITE.removeQuizQuestion, { quiz_id: '13', question_id: 23 }),
      op(
        3,
        WRITE.addQuizQuestion,
        { quiz_id: '13', body: { question: 'Seven is prime.', question_type: 'true_false', mark: 1, correctans: '1' } },
        'local:abc',
      ),
      // Another quiz's work is not this one's.
      op(4, WRITE.removeQuizQuestion, { quiz_id: '99', question_id: 22 }),
    ],
    '13',
  )
  assert.deepEqual(composed.map((entry) => entry.key), ['22', 'local:abc'])
  assert.equal(composed[0].question.question, 'What is 8 x 7?')
  assert.equal(composed[0].question.mark, 3)
  // The answer key a rewrite did not touch is kept.
  assert.equal(composed[0].question.correct_option, '2')
  assert.equal(composed[1].waiting, true)
  assert.deepEqual(composed[1].question.options, { '1': 'True', '2': 'False' })
})

test('what the school took is drawn at once, and gives way to the record without doubling', () => {
  const added: QuizQuestion = { ...STORED, id: 30, order: 2, question: 'New one' }
  const landed = {
    added: [added],
    rewritten: { '22': { question: 'What is 8 x 7?', mark: 3 } },
    removed: [],
  }
  const before = withLanded([STORED], landed)
  assert.deepEqual(before.map((one) => one.id), [22, 30])
  assert.equal(before[0].question, 'What is 8 x 7?')
  assert.equal(before[0].correct_option, '2')
  // The record has caught up: the added question is not drawn twice.
  const after = withLanded([STORED, added], landed)
  assert.deepEqual(after.map((one) => one.id), [22, 30])
  // A delete the school took is gone before the record says so.
  assert.deepEqual(withLanded([STORED, added], { ...landed, removed: ['30'] }).map((one) => one.id), [22])
})
