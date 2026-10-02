import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assignmentBody } from './assignment-body.ts'

const FILLED = {
  subject_id: '2',
  department_id: '6',
  title: '  Mid-term test  ',
  details: 'Answer all questions.',
  // Left over from a form opened on an old paper. The school dropped all
  // four on 2026-10-02, so none of them may reach the body.
  time_limit: '30',
  passing_score: '50',
}

test('the form submits ids, not the text it was typed as — and nothing a quiz owns', () => {
  assert.deepEqual(assignmentBody(FILLED), {
    subject_id: 2,
    department_id: 6,
    // Left empty: every arm of the class, which is the ordinary case.
    class_arm_id: null,
    title: 'Mid-term test',
    details: 'Answer all questions.',
    // Both ends of the window go every time, and an unset end goes as null —
    // the school's own "no bound", not a window that shuts at once.
    opendate: null,
    closedate: null,
  })
})

test('one arm goes as its id; none is every arm', () => {
  assert.equal(assignmentBody({ ...FILLED, class_arm_id: '47' }).class_arm_id, 47)
  assert.equal(assignmentBody({ ...FILLED, class_arm_id: '' }).class_arm_id, null)
})

test('no test type, time limit, pass mark or question count is ever sent', () => {
  for (const body of [assignmentBody(FILLED), assignmentBody(FILLED, 'active', ['status'])]) {
    for (const gone of ['test_type', 'time_limit', 'passing_score', 'total_questions']) {
      assert.equal(gone in body, false, gone)
    }
  }
})

test('status is sent only when it is being carried through an edit', () => {
  assert.equal('status' in assignmentBody(FILLED), false)
  assert.equal(assignmentBody(FILLED, 'active').status, 'active')
})

test('the window goes as the school writes it, with no zone on it', () => {
  const body = assignmentBody({
    ...FILLED,
    opens_at: '2026-09-21T08:00',
    closes_at: '2026-09-23T08:12',
  })
  assert.equal(body.opendate, '2026-09-21 08:00:00')
  assert.equal(body.closedate, '2026-09-23 08:12:00')
})

test('an unset end of the window is null rather than an empty string', () => {
  const body = assignmentBody({ ...FILLED, opens_at: '', closes_at: '2026-09-23T08:12' })
  assert.equal(body.opendate, null)
  assert.equal(body.closedate, '2026-09-23 08:12:00')
})

test('a locked paper is sent only what the school says it will take', () => {
  // `editable_when_locked` off bronze 2026-09-16. The whole body would be
  // refused outright — and refused for changing questions the teacher never
  // touched, on a paper where all they wanted was to move the deadline.
  const body = assignmentBody(
    { ...FILLED, title: 'A new title nobody may set', opens_at: '2026-09-21T08:00', closes_at: '2026-09-30T17:00' },
    'active',
    ['status', 'closedate'],
  )
  assert.equal(body.closedate, '2026-09-30 17:00:00')
  assert.equal(body.status, 'active')
  // Not offered, so not sent: the paper keeps the questions its pupils sat.
  assert.equal('opendate' in body, false)
  assert.equal('class_arm_id' in body, false)
  assert.equal('details' in body, false)
})

test('an unlocked paper is sent everything, lock or no lock named', () => {
  assert.equal('details' in assignmentBody(FILLED, 'active', null), true)
  assert.equal('details' in assignmentBody(FILLED, 'active', undefined), true)
})

test('a school that widens what a locked paper takes widens the body with it', () => {
  // Read off the row rather than decided here, so this needs no code change.
  const body = assignmentBody(FILLED, 'active', ['status', 'closedate', 'details'])
  assert.equal(body.details, 'Answer all questions.')
})
