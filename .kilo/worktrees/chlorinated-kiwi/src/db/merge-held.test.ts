import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeHeld } from './merge-held.ts'

type Day = { id: string; marks: number }

const day = (id: string, marks: number): Day => ({ id, marks })

test('a fresh answer replaces the held copy', () => {
  const held = new Map([['a:1', day('a:1', 3)]])
  const out = mergeHeld([{ key: 'a:1', fresh: day('a:1', 5) }], held)
  assert.deepEqual(out, [day('a:1', 5)])
})

test('a slice the school could not answer for keeps the copy the device held', () => {
  const held = new Map([
    ['a:1', day('a:1', 3)],
    ['a:2', day('a:2', 7)],
  ])
  const out = mergeHeld(
    [
      { key: 'a:1', fresh: day('a:1', 4) },
      { key: 'a:2', fresh: undefined },
    ],
    held,
  )
  assert.deepEqual(out, [day('a:1', 4), day('a:2', 7)])
})

test('every request failing hands back everything the device held, not an empty set', () => {
  // The case that used to erase a register: all slices refused, the fetch
  // resolved `[]`, and the empty answer became the collection's whole state.
  const held = new Map([
    ['a:1', day('a:1', 3)],
    ['b:1', day('b:1', 2)],
  ])
  const out = mergeHeld(
    [
      { key: 'a:1', fresh: undefined },
      { key: 'b:1', fresh: undefined },
    ],
    held,
  )
  assert.deepEqual(out, [day('a:1', 3), day('b:1', 2)])
})

test('a slice neither the school nor the device has is simply absent', () => {
  const out = mergeHeld([{ key: 'new', fresh: undefined }], new Map<string, Day>())
  assert.deepEqual(out, [])
})

test('a held slice that is no longer wanted is dropped — the one deliberate deletion', () => {
  // Yesterday rolled out of the window the device keeps.
  const held = new Map([['a:old', day('a:old', 9)]])
  const out = mergeHeld([{ key: 'a:new', fresh: day('a:new', 1) }], held)
  assert.deepEqual(out, [day('a:new', 1)])
})

test('the answer follows the order the slices were wanted in', () => {
  const held = new Map([['b', day('b', 2)]])
  const out = mergeHeld(
    [
      { key: 'a', fresh: day('a', 1) },
      { key: 'b', fresh: undefined },
      { key: 'c', fresh: day('c', 3) },
    ],
    held,
  )
  assert.deepEqual(
    out.map((one) => one.id),
    ['a', 'b', 'c'],
  )
})
