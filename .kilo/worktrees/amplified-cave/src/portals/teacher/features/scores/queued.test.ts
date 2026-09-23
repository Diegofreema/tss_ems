import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { EnterScoreBody } from '../../../../api/teaching/types.ts'
import { WRITE } from '../../../../db/ids.ts'
import type { OpState, OutboxOp } from '../../../../db/outbox.ts'
import { queuedScores, scoreKey } from './queued.ts'

function op(
  seq: number,
  body: Partial<EnterScoreBody>,
  state: OpState = 'queued',
  handler: string = WRITE.enterScore,
): OutboxOp {
  return {
    id: `op-${seq}`,
    seq,
    handler,
    payload: { student_id: 1, subject_id: 2, session_id: 1, semester_id: 1, ca: 0, exam: 0, ...body },
    collectionId: null,
    targetKey: null,
    dependsOn: [],
    createdAt: 0,
    attempts: 0,
    nextAttemptAt: 0,
    state,
    lastError: null,
    toast: { success: 'Scores saved' },
    label: 'Marks',
  }
}

test('a queued mark is found by its subject and student', () => {
  const held = queuedScores([op(1, { student_id: 7, subject_id: 3, ca: 20, exam: 50 })])
  assert.deepEqual(held.get(scoreKey(3, 7)), { ca: 20, exam: 50 })
})

test('the last mark typed for a child wins', () => {
  const held = queuedScores([
    op(1, { student_id: 7, subject_id: 3, ca: 20, exam: 50 }),
    op(2, { student_id: 7, subject_id: 3, ca: 25, exam: 55 }),
  ])
  assert.deepEqual(held.get(scoreKey(3, 7)), { ca: 25, exam: 55 })
})

test('ops are merged in seq order however they arrive', () => {
  const held = queuedScores([
    op(2, { student_id: 7, subject_id: 3, ca: 25, exam: 55 }),
    op(1, { student_id: 7, subject_id: 3, ca: 20, exam: 50 }),
  ])
  assert.deepEqual(held.get(scoreKey(3, 7)), { ca: 25, exam: 55 })
})

test('the same child in another subject is another mark', () => {
  const held = queuedScores([
    op(1, { student_id: 7, subject_id: 3, ca: 20, exam: 50 }),
    op(2, { student_id: 7, subject_id: 9, ca: 30, exam: 60 }),
  ])
  assert.deepEqual(held.get(scoreKey(3, 7)), { ca: 20, exam: 50 })
  assert.deepEqual(held.get(scoreKey(9, 7)), { ca: 30, exam: 60 })
})

test('a refused mark is not drawn as filed', () => {
  const held = queuedScores([op(1, { student_id: 7, subject_id: 3 }, 'failed')])
  assert.equal(held.size, 0)
})

test('another kind of queued write is not mistaken for a mark', () => {
  const held = queuedScores([op(1, { student_id: 7, subject_id: 3 }, 'queued', WRITE.addTopic)])
  assert.equal(held.size, 0)
})

test('a zero is a mark, not a missing one', () => {
  const held = queuedScores([op(1, { student_id: 7, subject_id: 3, ca: 0, exam: 0 })])
  assert.deepEqual(held.get(scoreKey(3, 7)), { ca: 0, exam: 0 })
})
