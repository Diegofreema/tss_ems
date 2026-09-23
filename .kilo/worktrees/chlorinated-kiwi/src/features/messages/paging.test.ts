import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FIRST_PAGE, hasMore, NEXT_PAGE, pageOf, windowFor } from './paging.ts'

const rows = Array.from({ length: 57 }, (_, index) => index)

test('the first window is a couple of screens, not the whole inbox', () => {
  assert.equal(pageOf(rows, FIRST_PAGE).length, FIRST_PAGE)
  assert.deepEqual(pageOf(rows, 3), [0, 1, 2])
})

test('a window wider than the inbox draws the inbox, not padding', () => {
  assert.equal(pageOf(rows, 500).length, 57)
  assert.deepEqual(pageOf([], 20), [])
  // Nonsense in, nothing out — never a negative slice, which would read from
  // the end of the list and show the oldest threads first.
  assert.deepEqual(pageOf(rows, -5), [])
})

test('there is more until there is not', () => {
  assert.equal(hasMore(57, 20), true)
  assert.equal(hasMore(57, 57), false)
  assert.equal(hasMore(0, 20), false)
})

test('a window past the end of the list is harmless, not a bug to guard', () => {
  // The reader kept scrolling, or a search narrowed the list under them. The
  // slice is what is there and nothing is left to draw.
  assert.deepEqual(pageOf(rows, 57 + NEXT_PAGE).length, 57)
  assert.equal(hasMore(57, 57 + NEXT_PAGE), false)
})

test('the window reaches a thread opened from the URL', () => {
  // A reload, a shared link or the back button can open a thread sitting well
  // below the first page. Its row has to be in the list beside it.
  assert.equal(windowFor(41, FIRST_PAGE), 42)
  // One already on screen does not shrink the window back down.
  assert.equal(windowFor(3, 40), 40)
  // Not in this list at all — filtered out by the tabs, or nothing open.
  assert.equal(windowFor(-1, 40), 40)
})
