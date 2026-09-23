import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { StudentContent } from '../../../../api/my-schooling/types.ts'
import { postedOn, topicMeta, topicRows } from './topics.ts'

/**
 * `GET /students/me/content` off bronze 2026-09-16, trimmed to three topics
 * across two subjects. `posted` is the school's own US-locale display string.
 */
const CONTENT: StudentContent = {
  subjects: [
    { id: 7, name: 'IGBO LANGUAGE' },
    { id: 1, name: 'ENGLISH LANGUAGE' },
  ],
  materials: [],
  message: null,
  topics: [
    {
      id: 8,
      kind: 'topic',
      title: 'Mbido Igbo',
      subject_id: 7,
      subject: 'IGBO LANGUAGE',
      teacher: 'NETPRO2 TEACHER2',
      contents: '<p>Mbido Igbo</p>',
      posted: '9/16/26, 8:21 AM',
      updated: null,
    },
    {
      id: 4,
      kind: 'topic',
      title: 'Akwukwo',
      subject_id: 7,
      subject: 'IGBO LANGUAGE',
      teacher: 'NETPRO2 TEACHER2',
      contents: '<p>Earlier</p>',
      posted: '9/1/26, 2:05 PM',
      updated: null,
    },
    {
      id: 2,
      kind: 'topic',
      title: 'oidhfnaiosdynxapsodxapsi',
      subject_id: 1,
      subject: 'ENGLISH LANGUAGE',
      teacher: 'Teacher u 1 New Teacher',
      contents: '<table class="MsoNormalTable"><tbody><tr><td>Uba Samson</td></tr></tbody></table>',
      posted: '9/4/26, 10:47 AM',
      updated: null,
    },
  ],
}

test('a subject shows its own topics and nobody else’s', () => {
  const rows = topicRows(CONTENT, '7')
  assert.deepEqual(rows.map((row) => row.title), ['Mbido Igbo', 'Akwukwo'])
  assert.equal(topicRows(CONTENT, '1').length, 1)
})

test('the subject is matched as a string, which is what a record id is', () => {
  // A number compared against a record id is silently never equal, and the tab
  // would read as "your teacher has written nothing" for every subject.
  assert.equal(topicRows(CONTENT, '7').length, 2)
  assert.equal(topicRows(CONTENT, '007').length, 0)
})

test('newest first — a scheme is read at the end just added to', () => {
  assert.deepEqual(topicRows(CONTENT, '7').map((row) => row.id), ['8', '4'])
})

test('the American stamp the school sends is read, not handed to Date', () => {
  // "9/16/26, 8:21 AM" parsed as ISO is blank, which is how an assignment's
  // opening date was wiped once already.
  assert.equal(postedOn(CONTENT.topics![0]!), '16 Sept 2026, 08:21')
  // Midnight and noon are the pair that does not simply add twelve.
  assert.equal(postedOn({ id: 1, posted: '9/16/26, 12:30 AM' }), '16 Sept 2026, 00:30')
  assert.equal(postedOn({ id: 1, posted: '9/16/26, 12:30 PM' }), '16 Sept 2026, 12:30')
})

test('a stamp in some other dialect is shown as the school wrote it', () => {
  // A date a child can read beats a dash, even in the wrong dialect.
  assert.equal(postedOn({ id: 1, posted: 'Tuesday teatime' }), 'Tuesday teatime')
  assert.equal(postedOn({ id: 1, posted: null }), '')
})

test('the quiet line names the teacher and when they wrote it', () => {
  assert.equal(topicMeta(CONTENT.topics![0]!), 'NETPRO2 TEACHER2 · 16 Sept 2026, 08:21')
  // Either half missing leaves the other standing alone, with no stray dot.
  assert.equal(topicMeta({ id: 1, teacher: 'Mrs Okafor' }), 'Mrs Okafor')
  assert.equal(topicMeta({ id: 1, posted: '9/4/26, 10:47 AM' }), '04 Sept 2026, 10:47')
  assert.equal(topicMeta({ id: 1 }), '')
})

test('the body is handed over exactly as the school stored it', () => {
  // Including markup this app never wrote — one live topic is a table pasted
  // out of Word. Sanitising is the view's job, against the editor's own
  // schema; stripping it here would be a second, worse sanitiser.
  const [row] = topicRows(CONTENT, '1')
  assert.match(row!.contents, /MsoNormalTable/)
})

test('a topic with no title is still openable', () => {
  const [row] = topicRows({ topics: [{ id: 9, subject_id: 7, title: '  ' }] }, '7')
  assert.equal(row!.title, 'Untitled topic')
})

test('nothing for this subject, and nothing at all, are both empty lists', () => {
  assert.deepEqual(topicRows(CONTENT, '99'), [])
  assert.deepEqual(topicRows({ topics: [] }, '7'), [])
  assert.deepEqual(topicRows(undefined, '7'), [])
})
