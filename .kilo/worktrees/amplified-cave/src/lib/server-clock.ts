/**
 * The school's clock, as closely as this browser can follow it.
 *
 * Anything that times a person — an assignment's countdown above all — is
 * measured against this rather than `Date.now()`, because the device clock
 * belongs to the person being timed. Every API response carries a `Date`
 * header, so the offset between the two is re-read continuously and for
 * nothing; winding the device forward or back moves `Date.now()` and the
 * offset together, and the reading stays where it was.
 *
 * It is not a security boundary and cannot be made one here: a student who
 * edits the page can have any clock they like. What it stops is the ordinary
 * trick of changing the device's own time, and what it fixes for everyone else
 * is a laptop that is simply wrong by ten minutes. The deadline itself has to
 * come from the server before any of this can be leaned on — see the note in
 * `assignments/attempt.ts`.
 */

/**
 * Where the last anchor is kept between visits.
 *
 * Not in the device's database: this has to be readable the instant a module
 * loads, before anything is opened, and it is one number. `localStorage` is
 * synchronous and survives a reload, which is exactly the shape of the problem.
 */
const KEY = 'netpro.clock'

/**
 * Beyond this, a stored anchor is treated as rubbish rather than as a school
 * two days out of step with the world. It would mean the device's own clock had
 * been changed since the offset was measured, and a wrong correction is worse
 * than none.
 */
const SANE_MS = 2 * 24 * 60 * 60 * 1000

/** School time minus device time, in ms. Zero until a response has been seen. */
let offset = restored()

/**
 * The last anchor this device took, so an offline reload does not go back to
 * trusting the device's own clock.
 *
 * A student sitting an assignment on a laptop that is ten minutes fast keeps the
 * correction through a reload with no signal, which is the one time nothing can
 * re-measure it. Guarded on every side: there is no storage at all under
 * `node --test`, a private window can throw on read, and what comes back is
 * whatever was last written there by anybody.
 */
function restored(): number {
  try {
    return usableOffset(globalThis.localStorage?.getItem(KEY))
  } catch {
    return 0
  }
}

/**
 * What a stored anchor is worth, which is nothing unless it is a plausible
 * number of milliseconds.
 *
 * Separated out and tested because getting it wrong is quiet: whatever is under
 * this key was written by whoever used this browser last, and a nonsense value
 * read as a number would silently move every deadline a student is timed against.
 */
export function usableOffset(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0
  const held = Number(raw)
  return Number.isFinite(held) && Math.abs(held) < SANE_MS ? held : 0
}

function remember(value: number): void {
  try {
    globalThis.localStorage?.setItem(KEY, String(value))
  } catch {
    // A browser that refuses storage still gets the anchor for this visit.
  }
}

/**
 * Reads a response's `Date` header. Anything missing or unparseable leaves the
 * offset alone rather than resetting it to zero — one odd response should not
 * throw away a good anchor.
 *
 * The header carries whole seconds and is stamped before the response travels,
 * so this runs up to a second or so behind. Nothing here is doing arithmetic
 * fine enough to care.
 */
export function noteServerTime(header: string | null | undefined): void {
  if (!header) return
  const server = Date.parse(header)
  if (Number.isNaN(server)) return
  offset = server - Date.now()
  remember(offset)
}

/** Epoch ms on the school's clock, falling back to this device's until anchored. */
export function serverNow(): number {
  return Date.now() + offset
}
