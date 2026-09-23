import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pageWindow } from './page-window.ts'

test('a short register is every page it has', () => {
  assert.deepEqual(pageWindow(1, 1), [1])
  assert.deepEqual(pageWindow(2, 2), [1, 2])
  assert.deepEqual(pageWindow(1, 5), [1, 2, 3, 4, 5])
})

/*
 * The regression this module was pulled out for. The last page holds fewer
 * rows than a full one, and the count used to be worked back out of the rows
 * on screen — so twelve rows at eight to a page offered a page 3 from page 2,
 * and ten rows offered a page 5. The page count is passed in now; nothing here
 * may re-derive it.
 */
test('the run never runs past the last page', () => {
  for (const last of [2, 3, 4, 7, 40]) {
    for (const current of [1, 2, last]) {
      const drawn = pageWindow(current, last).filter(
        (entry): entry is number => entry !== 'gap',
      )
      assert.ok(
        drawn.every((page) => page >= 1 && page <= last),
        `page ${current} of ${last} drew ${drawn.join(',')}`,
      )
    }
  }
})

test('a long register is cut, with the page you are on kept', () => {
  assert.deepEqual(pageWindow(1, 40), [1, 2, 3, 'gap', 40])
  assert.deepEqual(pageWindow(7, 40), [1, 2, 3, 'gap', 7, 40])
  assert.deepEqual(pageWindow(40, 40), [1, 2, 3, 'gap', 40])
})

test('a count the endpoint could not give is one page, not none', () => {
  assert.deepEqual(pageWindow(1, 0), [1])
})
