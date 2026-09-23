import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ConversationSummary } from '../../api/conversations/types.ts'
import {
  filterCounts,
  inboxUnread,
  isClosed,
  threadHeading,
  visibleThreads,
  withNames,
} from './inbox.ts'

const thread = (over: Partial<ConversationSummary>): ConversationSummary => ({
  id: 1,
  subject: 'fee payment',
  status: 'open',
  student_id: null,
  about: null,
  with: [{ user_id: 518, name: 'NETPRO2 TEACHER2', role: 'Teacher' }],
  last_message: 'Of course.',
  last_message_at: '9/8/26, 11:12 AM',
  unread: 0,
  ...over,
})

test('the open filter hides closed threads and the closed filter hides open ones', () => {
  const rows = [thread({ id: 1 }), thread({ id: 2, status: 'closed' })]
  assert.deepEqual(visibleThreads(rows, 'open', '').map((row) => row.id), [1])
  assert.deepEqual(visibleThreads(rows, 'closed', '').map((row) => row.id), [2])
  assert.equal(visibleThreads(rows, 'all', '').length, 2)
})

test('a thread with no status at all is treated as open', () => {
  const rows = [thread({ status: null as unknown as 'open' })]
  assert.equal(visibleThreads(rows, 'open', '').length, 1)
})

test('the search reaches the names on the thread, not only the subject', () => {
  const rows = [thread({})]
  assert.equal(visibleThreads(rows, 'all', 'netpro2').length, 1)
  assert.equal(visibleThreads(rows, 'all', 'fee').length, 1)
  assert.equal(visibleThreads(rows, 'all', 'geography').length, 0)
})

test('words match separately, so a two-word name in either order finds it', () => {
  const rows = [thread({ with: [{ user_id: 1, name: 'Chidi Okafor', role: 'Parent' }] })]
  assert.equal(visibleThreads(rows, 'all', 'okafor chidi').length, 1)
})

test('a thread with no subject is headed by who it is with', () => {
  assert.equal(threadHeading(thread({ subject: '  ' })), 'NETPRO2 TEACHER2')
  assert.equal(threadHeading(thread({ subject: null, with: [] })), 'Conversation')
})

test('names are joined, and a nameless participant is left out', () => {
  const row = thread({
    with: [
      { user_id: 1, name: 'Ada Obi', role: 'Parent' },
      { user_id: 2, name: '', role: 'Teacher' },
    ],
  })
  assert.equal(withNames(row), 'Ada Obi')
})

test('the badge is the envelope total, and nonsense reads as nothing', () => {
  assert.equal(inboxUnread({ conversations: [], unread: 4, message: null }), 4)
  assert.equal(inboxUnread(undefined), 0)
  assert.equal(
    inboxUnread({ conversations: [], unread: -1 as number, message: null }),
    0,
  )
})

test('the tabs count off the whole set', () => {
  const rows = [thread({ id: 1 }), thread({ id: 2, status: 'closed' }), thread({ id: 3 })]
  assert.deepEqual(filterCounts(rows), { open: 2, closed: 1, all: 3 })
})

test('closed is closed, and nothing else is', () => {
  assert.equal(isClosed('closed'), true)
  assert.equal(isClosed('open'), false)
  assert.equal(isClosed(null), false)
})
