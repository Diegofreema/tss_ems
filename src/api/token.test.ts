import assert from 'node:assert/strict'
import { test } from 'node:test'

/**
 * The module reads `globalThis.localStorage` lazily, so these have to stand in
 * before it is imported. Node has neither.
 */
function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size
    },
  } as Storage
}

const local = fakeStorage()
const session = fakeStorage()
Object.defineProperty(globalThis, 'localStorage', { value: local })
Object.defineProperty(globalThis, 'sessionStorage', { value: session })

const { getToken, setToken } = await import('./token.ts')

const KEY = 'netpro.token'
const hour = 60 * 60 * 1000
const iso = (ms: number) => new Date(Date.now() + ms).toISOString()

test('a remembered sign-in outlives the tab, an unremembered one does not', () => {
  setToken('remembered', { remember: true, expires: iso(12 * hour) })
  assert.equal(local.getItem(KEY), 'remembered')
  assert.equal(session.getItem(KEY), null)

  setToken('just-this-tab', { remember: false, expires: iso(12 * hour) })
  assert.equal(session.getItem(KEY), 'just-this-tab')
  // The point of the test: the earlier remembered token must not be left
  // behind for the browser to find after it closes.
  assert.equal(local.getItem(KEY), null)

  setToken(null)
  assert.equal(local.getItem(KEY), null)
  assert.equal(session.getItem(KEY), null)
  assert.equal(getToken(), null)
})

test('a token the server has already expired is dropped, not sent', () => {
  setToken('stale', { remember: true, expires: iso(-1) })
  assert.equal(getToken(), null)
  assert.equal(local.getItem(KEY), null)

  setToken('live', { remember: true, expires: iso(hour) })
  assert.equal(getToken(), 'live')
})

test('a token the server gave no expiry for is kept until it is refused', () => {
  setToken('undated', { remember: true })
  assert.equal(getToken(), 'undated')
  setToken(null)
})
