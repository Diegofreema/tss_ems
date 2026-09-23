import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Notice } from '../../../api/notifications/types.ts'
import { audienceLabel, audienceOptions, noticeRow, reachOf } from './notice-row.ts'

/** `GET /notifications?limit=50` as an admin on bronze, read 2026-09-01. */
const NOTICE: Notice = {
  id: 1,
  title: 'test note',
  message: 'testing notes',
  datecreated: '2026-08-12T09:43:12+01:00',
  user_id: 1,
  recipients: 'students',
  status: 'active',
  viewcount: 4,
  is_read: false,
  is_automatic: false,
  scope: 'school',
  class_name: null,
  posted_by: 'Chukwudi Aniegboka',
}

test('a notice reads as one line of the office register', () => {
  const row = noticeRow(NOTICE)
  assert.equal(row.id, '1')
  assert.equal(row.title, 'test note')
  assert.equal(row.audience, 'Pupils')
  assert.equal(row.reach, 'Whole school')
  assert.equal(row.views, '4')
  assert.equal(row.status, 'active')
  assert.equal(row.postedBy, 'Chukwudi Aniegboka')
  assert.equal(row.raised, 'By hand')
  // What the edit form submits, beside the words the table shows.
  assert.equal(row.recipients, 'students')
})

test('the message is flattened for the table, tags and all', () => {
  const rich = noticeRow({
    ...NOTICE,
    message: '<p>School closes on <strong>Friday</strong>.</p><ul><li>Bring books</li></ul>',
  })
  assert.doesNotMatch(rich.message, /</)
  assert.match(rich.message, /School closes on Friday/)
})

test('a notice limited to a class says which, and one that names none says so', () => {
  assert.equal(reachOf({ ...NOTICE, scope: 'class', class_name: 'JSS 1' }), 'JSS 1')
  assert.equal(reachOf({ ...NOTICE, scope: 'class', class_name: null }), 'One class')
  assert.equal(reachOf(NOTICE), 'Whole school')
})

test('an assignment raising its own notice is told apart from the office writing one', () => {
  assert.equal(noticeRow({ ...NOTICE, is_automatic: true }).raised, 'Automatically, by an assignment being set')
})

test('audiences read as an office says them, and an unknown one reads as itself', () => {
  assert.equal(audienceLabel('all'), 'Everyone')
  assert.equal(audienceLabel('students_parents'), 'Pupils and guardians')
  // The school growing a sixth audience must not blank the column.
  assert.equal(audienceLabel('bursary'), 'bursary')
  assert.equal(audienceLabel(null), '—')
})

test('the form offers exactly the audiences the board published', () => {
  // The catalogue `GET /notifications` sends beside its list.
  assert.deepEqual(
    audienceOptions(['all', 'students', 'teachers', 'parents', 'students_parents']),
    [
      { value: 'all', label: 'Everyone' },
      { value: 'students', label: 'Pupils' },
      { value: 'teachers', label: 'Teachers' },
      { value: 'parents', label: 'Guardians' },
      { value: 'students_parents', label: 'Pupils and guardians' },
    ],
  )
})
