import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assignmentBody } from './assignment-body.ts'

const FILLED = {
  subject_id: '2',
  department_id: '6',
  title: '  Mid-term test  ',
  details: 'Answer all questions.',
  time_limit: '30',
  passing_score: '50',
}

test('the form submits ids and figures, not the text it was typed as', () => {
  assert.deepEqual(assignmentBody(FILLED), {
    subject_id: 2,
    department_id: 6,
    title: 'Mid-term test',
    details: 'Answer all questions.',
    test_type: 'cbt_test',
    time_limit: 30,
    passing_score: 50,
    // Both ends of the window go every time, and an unset end goes as null —
    // the school's own "no bound", not a window that shuts at once.
    opendate: null,
    closedate: null,
  })
})

test('a blank limit is no limit, which is the API\'s own null', () => {
  const body = assignmentBody({ ...FILLED, time_limit: '', passing_score: undefined })
  assert.equal(body.time_limit, null)
  assert.equal(body.passing_score, null)
})

test('the design lets a figure be typed with separators', () => {
  assert.equal(assignmentBody({ ...FILLED, time_limit: '1,20' }).time_limit, 120)
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
  assert.equal('time_limit' in body, false)
  assert.equal('passing_score' in body, false)
  assert.equal('details' in body, false)
})

test('an unlocked paper is sent everything, lock or no lock named', () => {
  assert.equal('time_limit' in assignmentBody(FILLED, 'active', null), true)
  assert.equal('time_limit' in assignmentBody(FILLED, 'active', undefined), true)
})

test('a school that widens what a locked paper takes widens the body with it', () => {
  // Read off the row rather than decided here, so this needs no code change.
  const body = assignmentBody(FILLED, 'active', ['status', 'closedate', 'time_limit'])
  assert.equal(body.time_limit, 30)
})
