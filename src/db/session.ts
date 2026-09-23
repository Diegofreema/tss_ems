import { openFor } from './bootstrap'
import { resumeAfterSignIn, startDrain, stopDrain } from './drain'
import { runtime } from './runtime'
import { resetStore, storeMatchesRuntime } from './store'
import { removeForeignDatabases, wipeLocalDb } from './wipe'

/**
 * Hands this device to an account.
 *
 * Called on every sign-in, because the account signing in is not always the
 * account the device last held: a sign-out that never finished, a shared staff
 * room laptop, a second person on the same browser. Whenever it is somebody
 * new, the previous database goes before anything is allowed to sync into it.
 *
 * Belt to `endSession`'s braces. Either one alone would be a hole.
 */
export async function adoptDevice(ownerId: string): Promise<void> {
  if (runtime.ownerId !== null && runtime.ownerId !== ownerId) {
    await wipeLocalDb()
  }

  // And anything an interrupted sign-out left behind under somebody else's
  // name, which no later wipe would ever go looking for.
  await removeForeignDatabases(ownerId)

  await openFor(ownerId)

  /*
   * The store may already have been built — a boot with nobody signed in has
   * no database to open, so the outbox, the id map and the snapshots were
   * built against the localStorage fallback, and refs cached against the
   * wrong backing would keep this whole session's work there: safe until the
   * next reload bound to the real database and never read those keys again.
   * So the store is torn down and rebuilt against what is open now;
   * `startDrain` below reloads the queue, and `storeReady` walks anything the
   * fallback still holds into the durable store.
   */
  if (!storeMatchesRuntime()) {
    stopDrain()
    resetStore()
  }

  // A queue that stopped because the last token was refused can go again.
  resumeAfterSignIn()
  await startDrain()
}
