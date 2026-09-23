import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Book } from '../../api/library/types.ts'
import {
  canLend,
  freeCopies,
  lendableCount,
  lendingLabel,
  RESERVED_COPIES,
} from './book-read.ts'

/** Bronze's own row, read 2026-09-16: 15 copies, one out, 14 free. */
const LIVE = {
  id: 1,
  title: 'General Maths',
  author: 'Dr Jame Oka',
  isavailable: 14,
  copies: 15,
} as unknown as Book

/** The shape the same endpoint sent on 2026-09-15 and before. */
const WORDED = { ...LIVE, isavailable: 'Available' } as unknown as Book
const RETIRED = { ...LIVE, isavailable: 'Unavailable' } as unknown as Book

test('the count is read as a count', () => {
  assert.equal(freeCopies(LIVE), 14)
  assert.equal(lendingLabel(LIVE), 'Available')
  assert.equal(canLend(LIVE), true)
})

test('no free copy is "All out", which is not the same as retired', () => {
  const out = { ...LIVE, isavailable: 0 } as unknown as Book
  assert.equal(freeCopies(out), 0)
  assert.equal(lendingLabel(out), 'All out')
  assert.equal(canLend(out), false)
})

test('the old word still reads as it always did', () => {
  // A deployment still on the old shape must not be broken by the fix to the
  // new one.
  assert.equal(freeCopies(WORDED), null)
  assert.equal(lendingLabel(WORDED), 'Available')
  assert.equal(canLend(WORDED), true)
  assert.equal(lendingLabel(RETIRED), 'Unavailable')
  assert.equal(canLend(RETIRED), false)
})

test('a word is never read as nought copies', () => {
  // `Number('Available')` is NaN, and NaN read as a count empties a shelf of
  // thirty.
  assert.equal(freeCopies(WORDED), null)
  assert.notEqual(lendingLabel(WORDED), 'All out')
})

test('a count sent as a string is still a count', () => {
  const stringy = { ...LIVE, isavailable: '3' } as unknown as Book
  assert.equal(freeCopies(stringy), 3)
  assert.equal(lendingLabel(stringy), 'Available')
})

test('a row that says nothing says so rather than guessing', () => {
  const empty = { ...LIVE, isavailable: null } as unknown as Book
  assert.equal(freeCopies(empty), null)
  assert.equal(lendingLabel(empty), 'Unknown')
  // Not refused: only the word "Unavailable" is a refusal, and this is not it.
  assert.equal(canLend(empty), true)
})

/*
 * The reserve, set 2026-09-16: the library keeps its last copy back, so a
 * title is lendable only while more than `RESERVED_COPIES` are free.
 */

test('the last free copy is kept back rather than lent', () => {
  const last = { ...LIVE, isavailable: 1 } as unknown as Book
  assert.equal(freeCopies(last), 1)
  assert.equal(canLend(last), false)
  // Not "All out" — the copy is in the building and can be read there. The
  // two states are different news at a counter.
  assert.equal(lendingLabel(last), 'Unavailable')
})

test('one more than the reserve is still lendable', () => {
  const two = { ...LIVE, isavailable: 2 } as unknown as Book
  assert.equal(canLend(two), true)
  assert.equal(lendingLabel(two), 'Available')
})

test('a title the school holds one copy of never goes out', () => {
  // The policy stated plainly rather than discovered: a single copy is a
  // reference copy by definition.
  const only = { ...LIVE, isavailable: 1, copies: 1 } as unknown as Book
  assert.equal(canLend(only), false)
})

test('an empty shelf is still told apart from a reserved one', () => {
  const none = { ...LIVE, isavailable: 0 } as unknown as Book
  const last = { ...LIVE, isavailable: 1 } as unknown as Book
  assert.notEqual(lendingLabel(none), lendingLabel(last))
  assert.equal(canLend(none), false)
  assert.equal(canLend(last), false)
})

test('the picker reads the same rule off a bare stock figure', () => {
  // `onShelf` and `heldOnShelf` both go through this, so the counter cannot
  // offer a title online that it hides offline.
  assert.equal(lendableCount(14), true)
  assert.equal(lendableCount(2), true)
  assert.equal(lendableCount(1), false)
  assert.equal(lendableCount(0), false)
  assert.equal(lendableCount(-1), false)
})

test('a stock figure that cannot be read leaves the title offered', () => {
  // A dropped request is not evidence a book is gone, and the lend endpoint
  // refuses with its own reason where no copy is left.
  assert.equal(lendableCount(undefined), true)
  // `Number(null)` is 0, so this one has to be said out loud: a figure the
  // school did not send is unknown, not an empty shelf.
  assert.equal(lendableCount(null), true)
  assert.equal(lendableCount('not a number'), true)
  // A real nought is still a real nought.
  assert.equal(lendableCount(0), false)
})

test('the reserve is one copy, and it is written once', () => {
  assert.equal(RESERVED_COPIES, 1)
})
