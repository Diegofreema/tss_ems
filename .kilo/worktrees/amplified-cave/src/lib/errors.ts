// Relative and with the extension, so this module can be imported by
// `node --test` — see the note on tests in CLAUDE.md.
import { ApiError } from '../api/client.ts'

/**
 * What to put in front of a person when something failed.
 *
 * Three kinds of failure reach this, and only one of them has nothing worth
 * saying:
 *
 * - **The API refused it.** `ApiError` carries the school's own sentence, and
 *   that is always better than anything written here — "No parent record is
 *   linked to this account" tells the office something, and "Something went
 *   wrong" tells nobody anything.
 * - **The app refused it before it left.** A form body that cannot be built —
 *   no file chosen, no arm chosen, no term to file into — throws a plain
 *   `Error` saying exactly what to do about it. Those used to fall through to
 *   the fallback and be shown as a network failure, which sent people to
 *   check their connection over a dropdown they had not filled in.
 * - **The request never happened.** `fetch` rejects with a `TypeError`, and an
 *   abort with a `DOMException` — "Failed to fetch" and "signal is aborted
 *   without reason" are for a developer's console, not a bursar's screen. The
 *   fallback is the sentence for those.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message || fallback
  // A `TypeError` is either a dead connection or a bug in this app, and a
  // `DOMException` here is an abort. Neither has a message for a reader.
  if (error instanceof TypeError || error instanceof DOMException) return fallback
  if (error instanceof Error && error.message) return error.message
  return fallback
}

/** The message the design shows when the request never reached the server. */
export const OFFLINE_MESSAGE =
  'We could not reach the school system. Check your connection and try again.'
