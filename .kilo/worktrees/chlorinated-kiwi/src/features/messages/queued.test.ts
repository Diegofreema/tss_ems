import assert from 'node:assert/strict'
import { test } from 'node:test'
import { WRITE } from '../../db/ids.ts'
import type { OpState, OutboxOp } from '../../db/outbox.ts'
import { isQueuedThread, queuedReplies, queuedThreads } from './queued.ts'

function op(
  seq: number,
  handler: string,
  payload: unknown,
  state: OpState = 'queued',
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
    toast: { success: 'Message sent' },
    label: 'Message',
  }
}

const reply = (seq: number, id: unknown, body: string, state?: OpState) =>
  op(seq, WRITE.replyToConversation, { id, body: { body } }, state)

test('a queued reply is drawn in the thread it names, and nowhere else', () => {
  const ops = [reply(1, 30, 'On my way'), reply(2, 31, 'Different thread')]
  const drawn = queuedReplies(ops, 30)
  assert.equal(drawn.length, 1)
  assert.equal(drawn[0].body, 'On my way')
  assert.equal(drawn[0].mine, true)
  assert.equal(drawn[0].queued, true)
})

test('a thread id matches whether it arrived as a number or a string', () => {
  assert.equal(queuedReplies([reply(1, '30', 'a')], 30).length, 1)
  assert.equal(queuedReplies([reply(1, 30, 'a')], '30').length, 1)
})

test('only work still expected to land is drawn', () => {
  const ops = [
    reply(1, 30, 'queued'),
    reply(2, 30, 'sending', 'sending'),
    reply(3, 30, 'refused', 'failed'),
    reply(4, 30, 'needs a person', 'needs-review'),
  ]
  assert.deepEqual(
    queuedReplies(ops, 30).map((row) => row.body),
    ['queued', 'sending'],
  )
})

test('replies are drawn in the order they were written', () => {
  const drawn = queuedReplies([reply(2, 30, 'second'), reply(1, 30, 'first')], 30)
  assert.deepEqual(drawn.map((row) => row.body), ['first', 'second'])
})

test('a queued reply carries a key that cannot collide with a real message', () => {
  assert.equal(queuedReplies([reply(1, 30, 'a')], 30)[0].key, 'queued:op-1')
})

test('a conversation started on this device shows as a row of its own', () => {
  const rows = queuedThreads([
    op(1, WRITE.startConversation, {
      to: 518,
      subject: 'Homework question',
      body: 'Could you explain last night’s work?',
      student_id: 3,
    }),
  ])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].subject, 'Homework question')
  assert.equal(rows[0].student_id, 3)
  assert.equal(rows[0].unread, 0)
})

test('a queued thread’s id is negative, so it never collides with a real one', () => {
  const rows = queuedThreads([
    op(1, WRITE.startConversation, { to: 1, subject: 'a', body: 'a' }),
    op(2, WRITE.startConversation, { to: 2, subject: 'b', body: 'b' }),
  ])
  assert.deepEqual(rows.map((row) => row.id), [-1, -2])
  assert.equal(rows.every(isQueuedThread), true)
})

test('a thread with no child named carries none', () => {
  const [row] = queuedThreads([op(1, WRITE.startConversation, { to: 1, subject: 'a', body: 'a' })])
  assert.equal(row.student_id, null)
})

test('another kind of queued write is not a message', () => {
  assert.deepEqual(queuedThreads([op(1, WRITE.postNotice, {})]), [])
  assert.deepEqual(queuedReplies([op(1, WRITE.postNotice, {})], 30), [])
})
