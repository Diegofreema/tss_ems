/**
 * Doing something in one tab at a time.
 *
 * The drain is the reason this exists. A queued create is **not** idempotent —
 * the school issues the id — so two tabs draining the same queue at the same
 * moment is two students enrolled, two notices on the board, two of whatever was
 * written. The persistence coordinator keeps the tabs' *rows* in step; it says
 * nothing about which of them is allowed to send.
 *
 * A Web Lock is the right shape: it is held for as long as the work runs, it is
 * released if the tab is closed mid-flight, and asking for one that is already
 * held can be made to return immediately rather than queue up behind it —
 * which is what we want, because a second pass on the same queue has nothing
 * left to do.
 */

/** The one name. Not per account: one tab drains, whoever is signed in. */
const DRAIN_LOCK = 'netpro.drain'

/**
 * Runs `work` if no other tab is already running it, and answers whether it
 * ran.
 *
 * Where the browser has no Web Locks — an older Safari — this runs the work
 * unguarded, which is exactly the single-tab behaviour the app had before and
 * no worse than it.
 */
export async function onlyOneTab(work: () => Promise<void>): Promise<boolean> {
  const locks = globalThis.navigator?.locks

  if (!locks) {
    await work()
    return true
  }

  let ran = false
  await locks.request(DRAIN_LOCK, { ifAvailable: true }, async (lock) => {
    // Null means another tab holds it and is draining the same queue. There is
    // nothing for this one to do, and waiting would only run a second empty
    // pass the moment the first finished.
    if (!lock) return
    ran = true
    await work()
  })

  return ran
}
