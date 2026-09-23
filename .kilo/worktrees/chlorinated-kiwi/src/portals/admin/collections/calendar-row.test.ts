import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CalendarRecord } from '../../../api/calendar/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import {
  currentAction,
  sessionDeleteBody,
  sessionRow,
  termDeleteBody,
  termRow,
} from './calendar-row.ts'

/** 2024/2025 exactly as `GET /sessions/8` answers on bronze. */
const SESSION: CalendarRecord = {
  id: 8,
  name: '2024/2025',
  is_current: true,
  user_id: 1,
  created_by: 'Chukwudi Aniegboka',
  createdate: '2022-06-29T09:15:20+01:00',
  dependencies: {
    invoices: 8,
    transactions: 3,
    results: 1,
    courseregistrations: 2,
    students: 0,
  },
}

/** First Term as `GET /semesters/1` answers. A term carries no dates at all. */
const TERM: CalendarRecord = {
  id: 1,
  name: 'First Term',
  is_current: true,
  dependencies: {
    results: 1,
    subjects: 0,
    tests: 2,
    course_registrations: 79,
    course_assignments: 8,
  },
}

test('a session reads its counts and the day it was opened', () => {
  const row = sessionRow(SESSION)
  assert.equal(row.name, '2024/2025')
  assert.equal(row.state, 'Current')
  assert.equal(row.openedBy, 'Chukwudi Aniegboka')
  assert.equal(row.opened, '29 Jun 2022')
  assert.equal(row.invoices, '8')
  assert.equal(row.payments, '3')
  assert.equal(row.registrations, '2')
})

test('the list sends no counts, so they read blank rather than zero', () => {
  const { dependencies: _dropped, ...listed } = SESSION
  const row = sessionRow(listed)
  assert.equal(row.invoices, BLANK)
  assert.equal(row.results, BLANK)
  // What the list does send still reads.
  assert.equal(row.state, 'Current')
  assert.equal(row.opened, '29 Jun 2022')
})

test('a session nobody is named against reads blank, not "null"', () => {
  assert.equal(sessionRow({ ...SESSION, created_by: null }).openedBy, BLANK)
  assert.equal(sessionRow({ id: 3, name: '2019/2020', is_current: false }).opened, BLANK)
})

test('a term reads the counts its own endpoint keeps', () => {
  const row = termRow(TERM)
  assert.equal(row.name, 'First Term')
  assert.equal(row.state, 'Current')
  assert.equal(row.results, '1')
  assert.equal(row.tests, '2')
  assert.equal(row.registrations, '79')
  assert.equal(row.assignments, '8')
})

test('a session the school is not in says so rather than nothing', () => {
  assert.equal(termRow({ ...TERM, is_current: false }).state, 'Not current')
  assert.equal(sessionRow({ ...SESSION, is_current: false }).state, 'Not current')
})

test('the current one is refused outright, before anything is counted', () => {
  // The API will not delete it whatever is or is not filed under it, so the
  // count is beside the point and the dialog says the real reason.
  const body = sessionDeleteBody(sessionRow(SESSION))
  assert.match(body, /cannot be deleted while it is/)
  assert.doesNotMatch(body, /8 invoices/)
  assert.match(termDeleteBody(termRow(TERM)), /Make another term current first/)
})

test('a delete confirm names what would be stranded, and reads as a sentence', () => {
  const body = sessionDeleteBody(sessionRow({ ...SESSION, is_current: false }))
  assert.match(body, /8 invoices, 3 payments, 1 result and 2 registrations/)
})

test('one dependency is named in the singular, with no list punctuation', () => {
  const lone = { ...SESSION, is_current: false, dependencies: { results: 1 } }
  const body = sessionDeleteBody(sessionRow(lone))
  assert.match(body, /holds 1 result\./)
})

test('an empty session says so rather than listing nothing', () => {
  const empty = { ...SESSION, is_current: false, dependencies: { invoices: 0, results: 0 } }
  assert.match(sessionDeleteBody(sessionRow(empty)), /Nothing is filed under this session/)
  const term = { ...TERM, is_current: false, dependencies: { results: 0, tests: 0 } }
  assert.match(termDeleteBody(termRow(term)), /Nothing is filed under this term/)
})

test('the one already current is offered no button', () => {
  const action = currentAction('session')
  assert.equal(action.label(sessionRow(SESSION)), undefined)
  assert.equal(action.label(sessionRow({ ...SESSION, is_current: false })), 'Make current')
})

test('the confirm names the record and the toast says what changed', () => {
  const action = currentAction('term')
  const row = termRow({ ...TERM, id: 2, name: 'Second Term', is_current: false })
  assert.match(action.confirm(row), /filed under Second Term/)
  assert.equal(action.done(row), 'Second Term is now the current term')
  // The label is not a verb, so the dialog does not try to build a sentence
  // out of it.
  assert.equal(action.title(), 'Make this the current term?')
})
