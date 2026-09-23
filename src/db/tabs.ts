/**
 * Telling the other tabs something happened.
 *
 * Only one thing so far, and it is the one that matters on a shared machine:
 * signing out. A school laptop gets two tabs opened on it, and signing out of
 * one used to leave the other showing a register of real students — the token
 * gone, the records still on screen, and the device's database wiped out from
 * under it. The next person sat down to somebody else's school.
 *
 * A `BroadcastChannel` rather than a storage event: it is the same-origin
 * channel meant for this, it does not fire in the tab that posted, and it needs
 * no key to watch.
 */

const CHANNEL = 'netpro.tabs'

type TabMessage = { kind: 'signed-out' }

function channel(): BroadcastChannel | null {
  try {
    return 'BroadcastChannel' in globalThis ? new BroadcastChannel(CHANNEL) : null
  } catch {
    // A browser that refuses it simply keeps the old single-tab behaviour.
    return null
  }
}

/** Says that this tab has signed out, so the others can follow. */
export function announceSignOut(): void {
  const post = channel()
  if (!post) return
  post.postMessage({ kind: 'signed-out' } satisfies TabMessage)
  post.close()
}

/**
 * Follows a sign-out that happened in another tab.
 *
 * A hard navigation rather than a router redirect, and for the same reason
 * `wipeLocalDb` ends with one: this tab is holding collections, a worker handle
 * and a database that is being deleted underneath it, and no module can be
 * trusted to have let go of any of them.
 */
export function followSignOut(): () => void {
  const listen = channel()
  if (!listen) return () => {}

  listen.onmessage = (event: MessageEvent<TabMessage>) => {
    if (event.data?.kind !== 'signed-out') return
    globalThis.location?.assign('/sign-in')
  }

  return () => listen.close()
}
