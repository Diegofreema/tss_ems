import { ApiError } from '../api/client.ts'
import { OfflineError } from './errors.ts'

/**
 * What to do about a write that did not land.
 *
 * - `retryable` — the school never heard it. Keep it and send it again.
 * - `auth`      — the token was refused. Stop the whole queue rather than
 *                 spending anybody's work on attempts that cannot succeed.
 * - `terminal`  — the school heard it and said no. Sending it again would get
 *                 the same answer, so it is the reader's to resolve.
 */
export type Verdict = 'retryable' | 'auth' | 'terminal'

/** Refusals that mean "not now" rather than "not ever". */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

/**
 * Reads a failure and says what the queue should do with it.
 *
 * The distinction that matters most is 401. A token that expires with thirty
 * saved attendance marks still queued must not turn those marks into thirty
 * permanent failures — the marks are fine, the session is not. So an auth
 * refusal pauses the drain and burns no attempts, and the marks are still
 * there when somebody signs in again.
 *
 * **403 is not that.** This API answers 401 for a token it will not accept
 * ("Authentication required. Send a valid bearer token.") and keeps 403 for
 * what this account may not do to this particular row: a class you do not
 * teach, a child who is not yours, a subject that is not on your timetable,
 * somebody who is not on your contacts list. Reading those as an auth failure
 * paused the whole drain over one refused write, for the rest of the session —
 * the refused write sat in the banner saying it was "still being sent", the
 * "Send now" button returned at the `pausedForAuth` guard without sending
 * anything, and every write made after it queued up behind a message the
 * school was never going to take. Measured on `POST /conversations`, which
 * answers 403 for a recipient it will not deliver to.
 *
 * So 403 is terminal: that one op fails with the school's own sentence, goes
 * to the drawer where a person can read it and discard it, and the queue
 * carries on with everything behind it.
 */
export function classify(error: unknown): Verdict {
  if (error instanceof OfflineError) return 'retryable'

  if (error instanceof ApiError) {
    if (error.status === 401) return 'auth'
    if (RETRYABLE_STATUS.has(error.status)) return 'retryable'
    // A 4xx the server has explained. Asking again gets the same explanation.
    if (error.status >= 400 && error.status < 500) return 'terminal'
    return 'retryable'
  }

  // `fetch` rejects with a TypeError when the request never left the device —
  // no DNS, no route, connection dropped mid-flight. `request()` lets that
  // through untouched, so this is what a dead connection looks like here.
  if (error instanceof TypeError) return 'retryable'

  // An abort is the app's own doing — a navigation, a teardown — not a
  // refusal. A timeout is the client giving up on a socket that stopped
  // answering (`request()` bounds every send), which is a dropped connection
  // by another name: the school may or may not have heard, exactly as when
  // the link dies mid-flight, so it is retried the same way.
  if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return 'retryable'
  }

  // Anything with no story to tell is treated as final rather than replayed
  // forever against a server that may already have taken it.
  return 'terminal'
}

/**
 * How long to wait before attempt number `attempts + 1`, in milliseconds.
 *
 * Climbs to five minutes and stays there. A device that has been in a corridor
 * all afternoon should not be asking every second, but it must still be asking
 * when somebody walks back into range.
 */
const BACKOFF_MS = [1_000, 4_000, 15_000, 60_000, 300_000]

export function backoffFor(attempts: number): number {
  const index = Math.min(Math.max(attempts, 0), BACKOFF_MS.length - 1)
  return BACKOFF_MS[index]
}
