import assert from 'node:assert/strict'
import { test } from 'node:test'
import { WRITE } from '../../../db/ids.ts'
import type { OpState, OutboxOp } from '../../../db/outbox.ts'
import type { Row } from '../../../features/collections/types.ts'
import { withPendingCurrent, withPendingSubjectStatus } from './pending-state.ts'

function op(
  seq: number,
  payload: unknown,
  state: OpState = 'queued',
  handler: string = WRITE.setSubjectStatus,
): OutboxOp {
  return {
    id: `op-${seq}`,
    seq,
    handler,
    payload,
    collectionId: null,
    targetKey: null,
    dependsOn: [],
    createdAt: 0,
    attempts: 0,
    nextAttemptAt: 0,
    state,
    lastError: null,
    toast: { success: 'Subject updated' },
    label: 'A subject',
  }
}

const ROWS: Row[] = [
  { id: '1', name: 'Mathematics', status: 'Active' },
  { id: '2', name: 'Biology', status: 'Active' },
]

const statuses = (rows: Row[]) => rows.map((row) => `${row.id}:${row.status}`)

test('nothing queued leaves the register alone', () => {
  assert.equal(withPendingSubjectStatus(ROWS, []), ROWS)
})

test('a queued withdrawal shows the subject as withdrawn', () => {
  const rows = withPendingSubjectStatus(ROWS, [op(1, { id: 1, offered: false })])
  assert.deepEqual(statuses(rows), ['1:Inactive', '2:Active'])
})

test('a queued reinstatement shows it back', () => {
  const withdrawn: Row[] = [{ id: '1', name: 'Mathematics', status: 'Inactive' }]
  const rows = withPendingSubjectStatus(withdrawn, [op(1, { id: 1, offered: true })])
  assert.deepEqual(statuses(rows), ['1:Active'])
})

test('the last thing the office did wins', () => {
  const rows = withPendingSubjectStatus(ROWS, [
    op(1, { id: 1, offered: false }),
    op(2, { id: 1, offered: true }),
  ])
  assert.deepEqual(statuses(rows), ['1:Active', '2:Active'])
})

test('ops are read in seq order however they arrive', () => {
  const rows = withPendingSubjectStatus(ROWS, [
    op(2, { id: 1, offered: true }),
    op(1, { id: 1, offered: false }),
  ])
  assert.deepEqual(statuses(rows), ['1:Active', '2:Active'])
})

/*
 * A refused op is not going to land, so showing its state would tell the office
 * a subject was withdrawn when the school said no. The drawer owns that one.
 */
test('a failed op is not shown', () => {
  const rows = withPendingSubjectStatus(ROWS, [
    op(1, { id: 1, offered: false }, 'failed'),
  ])
  assert.deepEqual(statuses(rows), ['1:Active', '2:Active'])
})

test('another kind of queued write is not mistaken for a status change', () => {
  const rows = withPendingSubjectStatus(ROWS, [
    op(1, { id: 1, offered: false }, 'queued', WRITE.removeSubject),
  ])
  assert.deepEqual(statuses(rows), ['1:Active', '2:Active'])
})

test('an id is matched as text, whichever way the payload spells it', () => {
  const rows = withPendingSubjectStatus(ROWS, [op(1, { id: '2', offered: false })])
  assert.deepEqual(statuses(rows), ['1:Active', '2:Inactive'])
})


const YEARS: Row[] = [
  { id: '1', name: '2024/2025', state: 'Current' },
  { id: '2', name: '2025/2026', state: 'Not current' },
]

const states = (rows: Row[]) => rows.map((row) => `${row.id}:${row.state}`)

test('nothing queued leaves the calendar alone', () => {
  assert.equal(withPendingCurrent(YEARS, [], WRITE.setCurrentSession), YEARS)
})

/*
 * Exclusive, unlike a subject's status: making one current takes it off
 * whichever one had it, so the word has to move rather than simply be set.
 */
test('a queued make-current moves the word off the one that had it', () => {
  const rows = withPendingCurrent(
    YEARS,
    [op(1, 2, 'queued', WRITE.setCurrentSession)],
    WRITE.setCurrentSession,
  )
  assert.deepEqual(states(rows), ['1:Not current', '2:Current'])
})

test('only the last one the office chose counts', () => {
  const rows = withPendingCurrent(
    YEARS,
    [
      op(1, 2, 'queued', WRITE.setCurrentSession),
      op(2, 1, 'queued', WRITE.setCurrentSession),
    ],
    WRITE.setCurrentSession,
  )
  assert.deepEqual(states(rows), ['1:Current', '2:Not current'])
})

test('a failed make-current is not shown', () => {
  const rows = withPendingCurrent(
    YEARS,
    [op(1, 2, 'failed', WRITE.setCurrentSession)],
    WRITE.setCurrentSession,
  )
  assert.deepEqual(states(rows), ['1:Current', '2:Not current'])
})

test('a term op does not move the session register', () => {
  const rows = withPendingCurrent(
    YEARS,
    [op(1, 2, 'queued', WRITE.setCurrentTerm)],
    WRITE.setCurrentSession,
  )
  assert.deepEqual(states(rows), ['1:Current', '2:Not current'])
})
