import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  cascadeFrom,
  isLocalKey,
  nextOp,
  renumberImported,
  substitute,
  unresolved,
  type OutboxOp,
} from './outbox.ts'

const op = (over: Partial<OutboxOp> & Pick<OutboxOp, 'id' | 'seq'>): OutboxOp => ({
  handler: 'test.write',
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

test('the queue sends in the order the work was done, not the order it was stored', () => {
  const ops = [op({ id: 'c', seq: 3 }), op({ id: 'a', seq: 1 }), op({ id: 'b', seq: 2 })]
  assert.equal(nextOp(ops, 1_000)?.id, 'a')
})

test('one at a time: nothing else goes while an op is in flight', () => {
  const ops = [op({ id: 'a', seq: 1, state: 'sending' }), op({ id: 'b', seq: 2 })]
  assert.equal(nextOp(ops, 1_000), undefined)
})

test('a backoff at the head holds the whole queue behind it', () => {
  // Sending b before a has landed would reorder somebody's afternoon.
  const ops = [op({ id: 'a', seq: 1, nextAttemptAt: 5_000 }), op({ id: 'b', seq: 2 })]
  assert.equal(nextOp(ops, 1_000), undefined)
  assert.equal(nextOp(ops, 5_000)?.id, 'a')
})

test('a failed op blocks nothing — it is never going to land', () => {
  const ops = [
    op({ id: 'a', seq: 1, state: 'failed' }),
    op({ id: 'r', seq: 2, state: 'needs-review' }),
    op({ id: 'b', seq: 3 }),
  ]
  assert.equal(nextOp(ops, 1_000)?.id, 'b')
})

test('an empty queue asks for nothing', () => {
  assert.equal(nextOp([], 1_000), undefined)
})

test('what depended on a failure fails with it, all the way down', () => {
  const ops = [
    op({ id: 'child', seq: 1 }),
    op({ id: 'invoice', seq: 2, dependsOn: ['child'] }),
    op({ id: 'receipt', seq: 3, dependsOn: ['invoice'] }),
    op({ id: 'unrelated', seq: 4 }),
  ]
  const doomed = cascadeFrom(ops, 'child').sort()
  assert.deepEqual(doomed, ['invoice', 'receipt'])
})

test('nothing depending on it means nothing else fails', () => {
  assert.deepEqual(cascadeFrom([op({ id: 'a', seq: 1 })], 'a'), [])
})

test('a temp id is rewritten wherever it sits in the payload', () => {
  const ids = new Map<string, string | number>([['local:x', 41]])
  const payload = {
    student_id: 'local:x',
    marks: [{ student_id: 'local:x', status: 'present' }],
    note: 'local:x is not an id here', // only whole values are ids
    depth: { deeper: { student_id: 'local:x' } },
  }

  assert.deepEqual(substitute(payload, ids), {
    student_id: 41,
    marks: [{ student_id: 41, status: 'present' }],
    note: 'local:x is not an id here',
    depth: { deeper: { student_id: 41 } },
  })
})

test('an unresolved temp id is left alone and reported', () => {
  const ids = new Map<string, string | number>()
  assert.deepEqual(substitute({ id: 'local:x' }, ids), { id: 'local:x' })
  assert.deepEqual(unresolved({ id: 'local:x', other: ['local:y', 'local:x'] }, ids).sort(), [
    'local:x',
    'local:y',
  ])
})

test('a resolved id is not reported as waiting', () => {
  const ids = new Map<string, string | number>([['local:x', 7]])
  assert.deepEqual(unresolved({ id: 'local:x' }, ids), [])
})

test('a value that is not a shape survives being walked', () => {
  const when = new Date('2026-05-12T09:00:00Z')
  const out = substitute({ when, count: 3, ok: true, missing: null }, new Map())
  assert.equal(out.when, when, 'a Date must not be rebuilt from its entries')
  assert.deepEqual(out, { when, count: 3, ok: true, missing: null })
})

test('only a local key reads as one', () => {
  assert.equal(isLocalKey('local:abc'), true)
  assert.equal(isLocalKey('4'), false)
  assert.equal(isLocalKey(4), false)
  assert.equal(isLocalKey(null), false)
})

test('an import into an empty queue keeps the numbers the work was done under', () => {
  const imported = [op({ id: 'b', seq: 2 }), op({ id: 'a', seq: 1 })]
  assert.deepEqual(
    renumberImported([], imported).map((one) => [one.id, one.seq]),
    [
      ['a', 1],
      ['b', 2],
    ],
  )
})

test('an import into a live queue follows it, in its own order', () => {
  // Fallback seqs were issued against an empty queue; unchanged they would
  // tie or undercut work the durable queue already numbered.
  const existing = [op({ id: 'x', seq: 4 }), op({ id: 'y', seq: 7 })]
  const imported = [op({ id: 'b', seq: 2 }), op({ id: 'a', seq: 1 })]
  assert.deepEqual(
    renumberImported(existing, imported).map((one) => [one.id, one.seq]),
    [
      ['a', 8],
      ['b', 9],
    ],
  )
})
