const STORAGE_KEY = 'netpro.token'
const EXPIRY_KEY = 'netpro.token.expires'

/**
 * The bearer token lives here rather than in a store, because the fetch client
 * needs it outside React and the auth hooks need to set it from inside. Kept in
 * a module variable so a request never touches storage, and mirrored to browser
 * storage so a reload stays signed in.
 *
 * Which storage is what "remember this device" actually means here:
 * `localStorage` outlives the browser closing, `sessionStorage` does not. That
 * is the whole of it the browser can decide on its own — how long the token
 * stays *valid* is the server's alone, and this one lasts twelve hours whatever
 * box was ticked. See `setToken`.
 */
let token: string | null = null

/** Epoch ms the server said this token dies, or 0 when it did not say. */
let expiresAt = 0

/** Storage is read once, on the first request after a reload. */
let loaded = false

export function getToken(): string | null {
  if (!loaded) load()

  // Dropped here rather than left to fail: a token the server will refuse is
  // no different from being signed out, and clearing it now means the guard
  // redirects instead of the whole portal flashing up and then emptying.
  if (token && expiresAt && Date.now() >= expiresAt) setToken(null)

  return token
}

export type TokenOptions = {
  /**
   * Whether the sign-in should survive closing the browser. False keeps it to
   * the tab, which is what an unticked "remember this device" is owed.
   */
  remember?: boolean
  /** The login answer's `expires`, an ISO timestamp. */
  expires?: string
}

export function setToken(next: string | null, options: TokenOptions = {}): void {
  token = next
  expiresAt = next && options.expires ? Date.parse(options.expires) || 0 : 0
  loaded = true
  write(next, options.remember === true)
}

/**
 * Always clears both stores before writing, so ticking the box on one sign-in
 * and leaving it unticked on the next does not leave the first one's token
 * behind in localStorage for the browser to find after it closes.
 */
function write(next: string | null, remember: boolean): void {
  for (const store of stores()) {
    try {
      store.removeItem(STORAGE_KEY)
      store.removeItem(EXPIRY_KEY)
    } catch {
      // ponytail: private-mode storage throws; the in-memory token still
      // carries the session until the tab closes.
    }
  }

  if (!next) return

  try {
    const store = remember ? globalThis.localStorage : globalThis.sessionStorage
    store.setItem(STORAGE_KEY, next)
    if (expiresAt) store.setItem(EXPIRY_KEY, String(expiresAt))
  } catch {
    // As above.
  }
}

/** localStorage first: a remembered sign-in outranks one left in a tab. */
function load(): void {
  loaded = true
  for (const store of stores()) {
    try {
      const stored = store.getItem(STORAGE_KEY)
      if (!stored) continue
      token = stored
      expiresAt = Number(store.getItem(EXPIRY_KEY)) || 0
      return
    } catch {
      // As above.
    }
  }
}

function stores(): Storage[] {
  try {
    return [globalThis.localStorage, globalThis.sessionStorage]
  } catch {
    return []
  }
}
