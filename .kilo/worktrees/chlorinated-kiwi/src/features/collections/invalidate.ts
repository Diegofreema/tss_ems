import type { QueryClient } from '@tanstack/react-query'

/**
 * The keys the app reads *derived* data under — data built out of other
 * endpoints' answers rather than being one endpoint's answer. That is why a
 * write which carefully drops its own domain key still leaves these showing
 * what used to be true: no domain owns them.
 *
 * - `['collection', path, …]` — a register's rows and the count tiles above
 *   them, mapped from whatever the collection's `source` fetched.
 * - `['record-modal', id, …]` — the record itself. Most records are a dialog
 *   over their register now rather than a page, so they live in the query cache
 *   instead of a route loader. Editing from a modal and coming back to it was
 *   the worst of these: the form saved, the register updated underneath, and
 *   the record on top of both still read the values just replaced.
 * - `['detail-tab', …]` — the sub-tables on a record.
 * - `['options', …]` and `['search', …]` — the pickers other forms are built
 *   from. A class added here is a class the student form has to offer, and that
 *   feed holds its answer for five minutes.
 */
const DERIVED = [
  ['collection'],
  ['record-modal'],
  ['detail-tab'],
  ['options'],
  ['search'],
  // The three portals' dashboards. Each is an aggregate of four or five
  // endpoints under a key of its own, so every write in the app moves a figure
  // on one of them and no domain root reaches them.
  ['admin', 'dashboard'],
  ['teaching', 'dashboard'],
  ['my-schooling', 'dashboard'],
  ['parent', 'family'],
  // The readers' own notification feeds. The office's board is a set on the
  // device now, so the write that changes it no longer passes through any key
  // — but a notice posted has to reach the people it was posted to, and their
  // lists are still read under this one.
  ['notices'],
]

/**
 * Drops every derived read after a write, wherever the write happened.
 *
 * Called for **every** mutation in the app, from the mutation cache in
 * `lib/query-client` — because the alternative was asking each of forty-odd
 * write sites to remember which registers happen to be built out of the
 * endpoint it just wrote to, and most of them did not. A teacher writing the
 * first question of an assignment updates `['set-assignments']` correctly and
 * leaves the assignment register reading "No questions"; a mark entered on the
 * scores sheet leaves "Browse results" showing the old grade. Neither page
 * knows the other exists, and neither should have to.
 *
 * Only what is on screen actually refetches. Everything else is marked stale
 * and costs nothing until it is next looked at.
 *
 * A collection's rows are only as fresh as what its `source` fetched, so the
 * sources read through `queryClient.query` rather than `ensureQueryData` —
 * which returns whatever is cached however stale, invalidation and all, and
 * would hand this refetch the same rows straight back.
 */
export function dropDerivedReads(queryClient: QueryClient): Promise<unknown> {
  const drop = () =>
    Promise.all(DERIVED.map((queryKey) => queryClient.invalidateQueries({ queryKey })))

  /*
   * Twice, and the second time is the one that matters for anything built out
   * of the device's own sets.
   *
   * A derived read that reads a collection — a record's sub-table counting
   * `heldRows`, a count tile, a register still on the query path — is a
   * snapshot of what the set held when it last ran, not a live query. The
   * resync and the invalidation used to be started together, so the refetch
   * raced the sync and won: it re-read the same rows, wrote them back as
   * fresh, and nothing ran again when the school's answer finally landed. A
   * teacher who filed a topic had to reload the page to see it.
   *
   * The first pass stays because most derived reads are not built on a set at
   * all — the dashboards, the audit log, the pickers — and those should not
   * wait on a sync they have nothing to do with. The second costs only what
   * is actually on screen: an invalidated query with no observer refetches
   * nothing, and at the moment of a write the reader is on one page.
   */
  return Promise.all([drop(), Promise.resolve(alsoDrop?.()).then(drop, drop)])
}

/** What else a write has to reach; see `alsoDropOnWrite`. */
let alsoDrop: (() => unknown) | undefined

/**
 * Adds something to what every write drops.
 *
 * The registers are moving off the query cache and onto the device, and an
 * invalidation does not reach a collection: a teacher who files a topic drops
 * `['collection']` correctly and the topic register, which no longer reads
 * that key, goes on showing what it held. So `src/db/collection.ts` registers
 * its own resync here as it is imported.
 *
 * A slot rather than an import because the dependency only runs one way. The
 * collections need the query client; the invalidation must not need the
 * collections, or the two modules import each other in a circle for the sake
 * of one call.
 *
 * What it hands back is awaited — a refusal included, since a device that
 * could not reach the school still has to drop what it derived. See the note
 * in `dropDerivedReads` for why the second pass exists at all.
 */
export function alsoDropOnWrite(drop: () => unknown): void {
  alsoDrop = drop
}
