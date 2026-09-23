import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ActivityLog } from '../../../api/logs/types.ts'
import { logRange, logRow } from './log-row.ts'

/** A Wednesday, well clear of a month or year boundary. */
const TODAY = new Date(2026, 7, 19)

const log: ActivityLog = {
  id: 42,
  title: 'Payment recorded',
  description: 'Recorded ₦95,000 against INV-25088',
  timestamp: '2026-08-19T09:42:00',
  type: 'Add',
  ip: '102.89.4.17',
  user_id: 12,
  user: 'Amaka Okonkwo',
  username: 'aokonkwo@netpro.africa',
}

test('today is a single inclusive day, not an open end', () => {
  assert.deepEqual(logRange('Today', TODAY), { from: '2026-08-19', to: '2026-08-19' })
})

test('a span of seven days counts today as one of them', () => {
  assert.deepEqual(logRange('Last 7 days', TODAY), { from: '2026-08-13', to: '2026-08-19' })
  assert.deepEqual(logRange('Last 30 days', TODAY), { from: '2026-07-21', to: '2026-08-19' })
})

test('a span reaching back past the first of the month still lands', () => {
  const early = new Date(2026, 2, 3)
  assert.deepEqual(logRange('Last 7 days', early), { from: '2026-02-25', to: '2026-03-03' })
})

test('the year starts in January, whatever month it is', () => {
  assert.deepEqual(logRange('This year', TODAY), { from: '2026-01-01', to: '2026-08-19' })
})

test('no preset is no range, so the log opens on everything', () => {
  assert.deepEqual(logRange(undefined, TODAY), {})
  assert.deepEqual(logRange('', TODAY), {})
  assert.deepEqual(logRange('Last fortnight', TODAY), {})
})

test('an entry names the person who acted, not their login', () => {
  assert.equal(logRow(log).user, 'Amaka Okonkwo')
  assert.equal(logRow(log).action, 'Recorded ₦95,000 against INV-25088')
  assert.equal(logRow(log).ip, '102.89.4.17')
})

test('an entry whose author was deleted still says who it was', () => {
  // The API drops both the name and the login together, leaving the id.
  assert.equal(logRow({ ...log, user: null }).user, 'aokonkwo@netpro.africa')
  assert.equal(logRow({ ...log, user: null, username: null }).user, 'User 12')
  assert.equal(
    logRow({ ...log, user: null, username: null, user_id: null }).user,
    'Deleted account',
  )
})

test('an entry with no description falls back to its title', () => {
  assert.equal(logRow({ ...log, description: '' }).action, 'Payment recorded')
})

test('a timestamp is written out, and junk is left alone', () => {
  assert.match(logRow(log).when, /19 Aug 2026/)
  assert.equal(logRow({ ...log, timestamp: 'not a date' }).when, 'not a date')
})
