import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AssignmentQuestion } from '../../../../api/set-assignments/types.ts'
import { WRITE } from '../../../../db/ids.ts'
import type { OutboxOp } from '../../../../db/outbox.ts'
import type { Row } from '../../../../features/collections/types.ts'
import {
  composeQuestions,
  withFreshQuestions,
  gradedCounters,
  queuedGrades,
  withQueuedGrades,
  withQueuedScores,
} from './queued.ts'

const op = (over: Partial<OutboxOp> & Pick<OutboxOp, 'id' | 'seq' | 'handler'>): OutboxOp => ({
  payload: {},
  collectionId: null,
  targetKey: null,
  dependsOn: [],
  createdAt: 0,
  attempts: 0,
  nextAttemptAt: 0,
  state: 'queued',
  lastError: null,
  toast: { success: 'Saved' },
  label: 'a write',
  ...over,
})

const question = (id: number, text: string, points = 2): AssignmentQuestion => ({
  id,
  question_text: text,
  question_type: 'multiple_choice',
  points,
})

test('a queued new question appears at the end, waiting, and holds what was typed', () => {
  const ops = [
    op({
      id: 'add',
      seq: 1,
      handler: WRITE.addQuestion,
      targetKey: 'local:q1',
      payload: {
        assignment_id: '7',
        body: { question_text: 'What is 2 + 2?', question_type: 'theory', points: 5 },
      },
    }),
  ]
  const out = composeQuestions([question(1, 'First')], ops, '7')
  assert.deepEqual(
    out.map((one) => [one.key, one.waiting]),
    [
      ['1', false],
      ['local:q1', true],
    ],
  )
  assert.equal(out[1].question.question_text, 'What is 2 + 2?')
  assert.equal(out[1].question.points, 5)
})

test('another assignment’s queued work does not reach this page', () => {
  const ops = [
    op({
      id: 'add',
      seq: 1,
      handler: WRITE.addQuestion,
      targetKey: 'local:q1',
      payload: { assignment_id: '8', body: { question_text: 'x', question_type: 'theory', points: 1 } },
    }),
  ]
  assert.deepEqual(composeQuestions([question(1, 'First')], ops, '7').length, 1)
})

test('a queued rewrite shows the new wording; a queued delete takes the question off', () => {
  const ops = [
    op({
      id: 'edit',
      seq: 1,
      handler: WRITE.updateQuestion,
      payload: {
        assignment_id: '7',
        question_id: 1,
        body: { question_text: 'Rewritten', question_type: 'multiple_choice', points: 3 },
      },
    }),
    op({
      id: 'gone',
      seq: 2,
      handler: WRITE.removeQuestion,
      payload: { assignment_id: '7', question_id: 2 },
    }),
  ]
  const out = composeQuestions([question(1, 'First'), question(2, 'Second')], ops, '7')
  assert.deepEqual(
    out.map((one) => [one.key, one.question.question_text]),
    [['1', 'Rewritten']],
  )
  assert.equal(out[0].question.points, 3)
})

test('a failed op is not drawn — that question belongs to the drawer', () => {
  const ops = [
    op({
      id: 'add',
      seq: 1,
      handler: WRITE.addQuestion,
      targetKey: 'local:q1',
      state: 'failed',
      payload: { assignment_id: '7', body: { question_text: 'x', question_type: 'theory', points: 1 } },
    }),
    op({
      id: 'review',
      seq: 2,
      handler: WRITE.removeQuestion,
      state: 'needs-review',
      payload: { assignment_id: '7', question_id: 1 },
    }),
  ]
  const out = composeQuestions([question(1, 'First')], ops, '7')
  // The failed add is absent and the needs-review delete has not removed
  // anything: neither is expected to land on its own.
  assert.deepEqual(
    out.map((one) => one.key),
    ['1'],
  )
})

test('later ops win, in the order the teacher worked', () => {
  const ops = [
    op({
      id: 'first',
      seq: 1,
      handler: WRITE.updateQuestion,
      payload: {
        assignment_id: '7',
        question_id: 1,
        body: { question_text: 'First rewrite', question_type: 'multiple_choice', points: 2 },
      },
    }),
    op({
      id: 'second',
      seq: 2,
      handler: WRITE.updateQuestion,
      payload: {
        assignment_id: '7',
        question_id: 1,
        body: { question_text: 'Second rewrite', question_type: 'multiple_choice', points: 2 },
      },
    }),
  ]
  const out = composeQuestions([question(1, 'First')], ops, '7')
  assert.equal(out[0].question.question_text, 'Second rewrite')
})

test('a question the school has taken is drawn before the set has caught up', () => {
  const out = composeQuestions(
    withFreshQuestions([question(1, 'First')], [question(9, 'Just written')]),
    [],
    '7',
  )
  assert.deepEqual(out.map((entry) => entry.question.question_text), ['First', 'Just written'])
  // The school has it and issued its id, so it edits and deletes like any
  // other — this is not queued work.
  assert.equal(out[1].waiting, false)
  assert.equal(out[1].key, '9')
})

test('once the set catches up the question is drawn once, not twice', () => {
  const caught = withFreshQuestions(
    [question(1, 'First'), question(9, 'Just written')],
    [question(9, 'Just written')],
  )
  assert.deepEqual(caught.map((one) => one.id), [1, 9])
})

test('deleting a question written a moment ago does not bring it back', () => {
  // The whole reason this is composed *before* the queue's overlay: appended
  // after it, the delete would take the row off and this would re-add it.
  const ops = [
    op({
      id: 'a',
      seq: 1,
      handler: WRITE.removeQuestion,
      payload: { assignment_id: '7', question_id: 9 },
    }),
  ]
  const out = composeQuestions(withFreshQuestions([], [question(9, 'Just written')]), ops, '7')
  assert.deepEqual(out, [])
})

test('rewriting a question written a moment ago shows the new wording', () => {
  const ops = [
    op({
      id: 'a',
      seq: 1,
      handler: WRITE.updateQuestion,
      payload: {
        assignment_id: '7',
        question_id: 9,
        body: { question_text: 'Rewritten', question_type: 'theory', points: 4 },
      },
    }),
  ]
  const out = composeQuestions(withFreshQuestions([], [question(9, 'Just written')]), ops, '7')
  assert.deepEqual(out.map((entry) => entry.question.question_text), ['Rewritten'])
})

test('with nothing fresh, the school\u2019s rows are handed back as they were', () => {
  const rows = [question(1, 'First')]
  assert.deepEqual(withFreshQuestions(rows, []), rows)
})

const gradeOp = (id: string, seq: number, submission: string, scores: Record<string, number>) =>
  op({
    id,
    seq,
    handler: WRITE.gradeSubmission,
    payload: { submission_id: submission, body: { scores } },
  })

test('a queued grade marks the row with its total', () => {
  const rows: Row[] = [
    { id: '36', name: 'Ada', state: 'To mark', score: '—' },
    { id: '37', name: 'Ben', state: 'To mark', score: '—' },
  ]
  const out = withQueuedGrades(rows, [gradeOp('g', 1, '36', { '305': 8, '306': 2 })])
  assert.deepEqual(out[0], { id: '36', name: 'Ada', state: 'Marked', score: '10' })
  assert.equal(out[1].state, 'To mark')
})

test('the counters move with the queued marks, but a regrade moves nothing', () => {
  const rows: Row[] = [
    { id: '36', name: 'Ada', state: 'To mark' },
    { id: '37', name: 'Ben', state: 'Marked' },
  ]
  const ops = [
    gradeOp('fresh', 1, '36', { '1': 5 }),
    gradeOp('again', 2, '37', { '2': 9 }),
  ]
  assert.deepEqual(gradedCounters({ sat: 2, marked: 1, waiting: 1 }, rows, ops), {
    sat: 2,
    marked: 2,
    waiting: 0,
  })
})

test('the sheet reopens on the marks the teacher gave', () => {
  const script = {
    submission: { assignment_id: 36, total_score: null },
    answers: [
      { answer_id: 305, score: null },
      { answer_id: 306, score: null },
    ],
  }
  const grade = queuedGrades([gradeOp('g', 1, '36', { '305': 8, '306': 0 })]).get('36')
  const out = withQueuedScores(script, grade)
  assert.equal(out.submission.total_score, 8)
  assert.deepEqual(
    out.answers?.map((answer) => answer.score),
    [8, 0],
  )
})
