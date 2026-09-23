import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isReadableThread,
  threadMessages,
  threadStatus,
  threadSubject,
} from './thread.ts'

/** The live answer, trimmed to what these read. Taken 2026-09-11. */
const live = {
  conversation: {
    id: 36,
    subject: 'Test',
    status: 'open' as const,
    student_id: null,
    about: null,
    with: [{ user_id: 351, name: 'Dr. IKECHUKWU AYOGU', role: 'Teacher' }],
    last_message: 'This is a test message',
    last_message_at: '9/11/26, 9:48 AM',
    unread: 0,
    messages: [
      {
        id: 61,
        user_id: 1,
        from: 'Chukwudi Aniegboka',
        mine: true,
        body: 'This is a test message',
        sent_at: '9/11/26, 9:48 AM',
      },
    ],
  },
}

test('the messages are read out of the envelope they arrive in', () => {
  // The whole point of this file. `messages` is a field of `conversation`,
  // not of the answer, and reading the top level found nothing — which drew
  // every thread in every portal as one this app could not display.
  const read = threadMessages(live, 1)
  assert.equal(read.length, 1)
  assert.equal(read[0].body, 'This is a test message')
  assert.equal(read[0].senderName, 'Chukwudi Aniegboka')
  assert.equal(read[0].at, '9/11/26, 9:48 AM')
  assert.equal(read[0].key, '61')
})

test('a thread read off the top level is not a thread', () => {
  assert.equal(isReadableThread({ messages: [] } as never), false)
  assert.equal(isReadableThread(undefined), false)
  assert.equal(isReadableThread({ conversation: { subject: 'x' } } as never), false)
  assert.equal(isReadableThread({ conversation: { messages: [] } } as never), true)
})

test("the school's own answer to whose message it is outranks ours", () => {
  // It knows which login is calling; this device only knows which id the
  // session happened to store. A reader with no id in the session would have
  // had their own messages drawn as somebody else's.
  const [only] = threadMessages(live, undefined)
  assert.equal(only.mine, true)
})

test('without it, the sender is compared with the reader', () => {
  const doc = {
    conversation: {
      messages: [
        { id: 1, user_id: 7, body: 'a' },
        { id: 2, user_id: 8, body: 'b' },
      ],
    },
  } as never

  const [mine, theirs] = threadMessages(doc, 7)
  assert.equal(mine.mine, true)
  assert.equal(theirs.mine, false)
  // And with nobody to compare against, nothing is claimed as the reader's.
  assert.equal(threadMessages(doc, undefined)[0].mine, false)
})

test('the order the server sent is the order kept', () => {
  const read = threadMessages(
    {
      conversation: {
        messages: [
          { id: 3, body: 'third' },
          { id: 1, body: 'first' },
        ],
      },
    } as never,
    undefined,
  )
  assert.deepEqual(read.map((row) => row.body), ['third', 'first'])
})

test('a row with no id still gets a stable key', () => {
  const read = threadMessages(
    { conversation: { messages: [{ body: 'a' }, { body: 'b' }] } } as never,
    undefined,
  )
  assert.deepEqual(read.map((row) => row.key), ['row-0', 'row-1'])
})

test('a missing field reads as empty, never as the blank dash', () => {
  const [only] = threadMessages(
    { conversation: { messages: [{ id: 1, body: 'a' }] } } as never,
    undefined,
  )
  assert.equal(only.at, '')
  assert.equal(only.senderName, '')
  assert.equal(only.senderId, undefined)
})

test('the subject and status fall back to what the inbox row already said', () => {
  assert.equal(threadSubject(live, 'fee payment'), 'Test')
  assert.equal(
    threadSubject({ conversation: { messages: [] } } as never, 'fee payment'),
    'fee payment',
  )
  assert.equal(threadStatus(live, 'closed'), 'open')
  assert.equal(threadStatus({ conversation: { messages: [] } } as never, 'open'), 'open')
  assert.equal(
    threadStatus({ conversation: { status: 'anything else' } } as never, 'open'),
    'open',
  )
})
