import assert from 'node:assert/strict'
import test from 'node:test'
import { askAgain, type AskableSet } from './freshen.ts'

/** A set that records what was done to it, and can be made to refuse. */
function set(id: string, log: string[], refuse = false): AskableSet {
  return {
    id,
    preload: async () => {
      log.push(`preload:${id}`)
      if (refuse) throw new Error('never synced')
    },
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

test('the device is waited for and the school is not', async () => {
  const log: string[] = []
  let answer: () => void = () => {}
  // The request that never comes back: a school on the end of a bad line, or
  // the 30s `request()` waits before giving up on one.
  const held = new Promise<void>((resolve) => {
    answer = resolve
  })
  let landed = false

  await askAgain(
    async (id) => {
      log.push(`ask:${id}`)
      return held
    },
    [set('results', log)],
    () => {
      landed = true
    },
  )

  // Returned with the request still outstanding. This is the whole point: a
  // route loader awaits this, and a page the device can already draw must not
  // be held behind a connection to draw it.
  assert.deepEqual(log, ['preload:results', 'ask:results'])
  assert.equal(landed, false)

  answer()
  await settle()
  assert.equal(landed, true)
})

test('everything is readied before anything is asked for', async () => {
  const log: string[] = []
  await askAgain(async (id) => log.push(`ask:${id}`), [
    set('timetable', log),
    set('courses', log),
  ])
  await settle()

  assert.deepEqual(log, [
    'preload:timetable',
    'preload:courses',
    'ask:timetable',
    'ask:courses',
  ])
})

test('a set that has never synced still lets the page open', async () => {
  const log: string[] = []
  // The refusal is what an offline device with no stored copy answers with,
  // and a route loader that let it through would take the page down over a
  // connection rather than draw the page's own empty state.
  await askAgain(async (id) => log.push(`ask:${id}`), [
    set('loans', log, true),
    set('results', log),
  ])
  await settle()

  assert.deepEqual(log, [
    'preload:loans',
    'preload:results',
    'ask:loans',
    'ask:results',
  ])
})

test('a school that refuses is not an error either', async () => {
  let asked = false
  await askAgain(
    async () => {
      throw new Error('offline')
    },
    [set('results', [])],
    () => {
      asked = true
    },
  )
  await settle()

  // And what is derived from the set is still dropped: a device that could not
  // reach the school has to stop showing a count it can no longer stand behind.
  assert.equal(asked, true)
})

test('what is derived is dropped after the answers land, never beside them', async () => {
  const log: string[] = []
  let answer: () => void = () => {}
  const held = new Promise<void>((resolve) => {
    answer = resolve
  })

  await askAgain(
    async (id) => {
      log.push(`ask:${id}`)
      return held
    },
    [set('invoices', log)],
    () => log.push('dropped'),
  )

  await settle()
  // Still in flight: dropping now would re-read the rows being replaced and
  // write them back as fresh, which is the race that makes a count tile
  // disagree with the register under it.
  assert.deepEqual(log, ['preload:invoices', 'ask:invoices'])

  answer()
  await settle()
  assert.deepEqual(log, ['preload:invoices', 'ask:invoices', 'dropped'])
})

test('nothing to freshen is not something to ask about', async () => {
  const log: string[] = []
  await askAgain(async (id) => log.push(`ask:${id}`), [undefined, undefined], () =>
    log.push('dropped'),
  )
  await settle()

  // A definition with no binding reads the API on its own account; asking for
  // nothing and then dropping the page's reads would be a refetch on every
  // navigation for no reason at all.
  assert.deepEqual(log, [])
})
