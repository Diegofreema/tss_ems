/**
 * Opening a page asks the school again.
 *
 * A collection syncs once — `preload()` starts it, and starting something
 * already started does nothing — so after the first sync of a portal, nothing
 * asked the school anything for the rest of the session. The sets carry a
 * 30s staleness and no window-focus refetch, and a stale query with nobody
 * triggering it is simply a query that does not run. A student who opened
 * their results in the morning, left the tab open and had marks released at
 * noon saw the morning's page until they reloaded the browser.
 *
 * This is the same decision `ALWAYS_ASK` made for the school's own shape, at
 * the level of a page rather than a dropdown: **freshness is the normal case
 * and the stored copy is the outage.** The request goes through the collection
 * rather than the service, deliberately — there is still one answer on the
 * device, the live queries above it redraw when it lands, and the collection's
 * own fetcher already decides what to do when the school cannot be reached.
 *
 * The ordering is the whole of it, and it is why this is a module with a test
 * rather than three lines in a loader:
 *
 * - **What the device holds is awaited; what the school says is not.** A route
 *   loader that waited on the network would hold the navigation for as long as
 *   the connection took — up to `request()`'s own 30s bound — to show a page
 *   the device could already draw. So the loader resolves as soon as the sets
 *   are readable and the answer arrives into a page that is already up.
 * - **Nothing here can fail.** Every refusal is swallowed: a set that could
 *   not be refreshed is a page showing what the school last said, which is the
 *   whole point of holding it. A loader that threw would take the page down
 *   over a connection, and a shell route's would take the portal.
 * - **`asked` runs after the answers have landed**, not beside them. What is
 *   *derived* from a set — a count tile, a record's sub-table — is a snapshot
 *   taken when it last ran, not a live query, so dropping those reads while
 *   the refetch is still in flight re-reads the rows being replaced and writes
 *   them back as fresh. That is the same race `dropDerivedReads` documents
 *   after a write, met here on the way into a page.
 */

/** A set this can ready and ask about: `schoolCollection`'s own shape. */
export type AskableSet = {
  id: string
  preload: () => Promise<void>
}

/**
 * Readies these sets, then asks for them again.
 *
 * Resolves when the device can answer. `ask` is the refetcher —
 * `refetchCollection` in the app, a spy under test — and `asked` is called once
 * every answer has settled, however it settled.
 */
export function askAgain(
  ask: (id: string) => Promise<unknown>,
  sets: readonly (AskableSet | undefined)[],
  asked?: () => unknown,
): Promise<void> {
  const wanted = sets.filter((set): set is AskableSet => set !== undefined)
  // A definition with nothing bound to the device reads the API on its own
  // account, and dropping what it derives would be a refetch on every
  // navigation in aid of a set that is not there.
  if (wanted.length === 0) return Promise.resolve()

  const ready = Promise.all(
    wanted.map((set) => set.preload().catch(() => undefined)),
  )

  void ready
    .then(() =>
      Promise.all(wanted.map((set) => ask(set.id).catch(() => undefined))),
    )
    .then(() => asked?.())
    .catch(() => undefined)

  return ready.then(() => undefined)
}
