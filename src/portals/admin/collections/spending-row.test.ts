import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Spending } from '../../../api/spendings/types.ts'
import {
  monthKey,
  spendingBody,
  spendingRow,
  spentIn,
  spentInYear,
} from './spending-row.ts'

/** Exactly what `GET /spendings` answered with, trimmed to what the row reads. */
const entry = {
  id: 4,
  amount: '20500.00',
  description: 'we bought fuel for the school bus on Monday 12/8/2026',
  datecreated: '2026-08-27T07:27:39+01:00',
  user_id: 1,
  user: { fname: 'Chukwudi', lname: 'Aniegboka', username: 'chukwudi.aniegboka@netpro.africa' },
} as unknown as Spending

test('the ledger reads the amount as money and the entry as a date', () => {
  const row = spendingRow(entry)
  assert.equal(row.spent, '₦20,500')
  assert.equal(row.date, '27 Aug 2026')
  assert.match(row.when, /27 Aug 2026/)
})

test('a spending is attributed by initial and surname', () => {
  assert.equal(spendingRow(entry).by, 'C. Aniegboka')
})

test('an entry whose person is gone is still attributable', () => {
  const orphan = { ...entry, user: { username: 'bursar@school.ng' } } as unknown as Spending
  assert.equal(spendingRow(orphan).by, 'bursar@school.ng')
  assert.equal(spendingRow({ ...entry, user: undefined }).by, 'User 1')
})

test('the edit form gets the raw figure, not the written amount', () => {
  // The numeric field refuses a naira sign, so prefilling it with one would
  // make an untouched form unsaveable.
  assert.equal(spendingRow(entry).amount, '20500')
})

test('an amount typed the way money reads goes as a number', () => {
  assert.equal(spendingBody({ amount: '412,000' }).amount, 412000)
  assert.equal(spendingBody({ amount: ' 20 500.50 ' }).amount, 20500.5)
  assert.equal(spendingBody({ amount: '' }).amount, 0)
})

test('the description is trimmed, since the endpoint refuses an empty one', () => {
  assert.equal(spendingBody({ description: '  Diesel  ' }).description, 'Diesel')
  assert.equal(spendingBody({}).description, '')
})

test('the month key is padded, as the summary spells it', () => {
  assert.equal(monthKey(new Date(2026, 7, 29)), '2026-08')
  assert.equal(monthKey(new Date(2026, 11, 1)), '2026-12')
})

test('a month with nothing in it reads zero rather than blank', () => {
  const months = [{ month: '2026-08', total: 20500, entries: 1 }]
  assert.deepEqual(spentIn(months, '2026-08'), months[0])
  assert.deepEqual(spentIn(months, '2026-09'), { month: '2026-09', total: 0, entries: 0 })
})

test('the year totals only its own months', () => {
  const months = [
    { month: '2026-08', total: 20500, entries: 1 },
    { month: '2026-01', total: 500, entries: 2 },
    { month: '2025-12', total: 999, entries: 1 },
  ]
  assert.equal(spentInYear(months, '2026'), 21000)
  assert.equal(spentInYear(months, '2024'), 0)
})
