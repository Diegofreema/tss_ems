import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { createCollection, type Collection } from '@tanstack/react-db'
import { alsoDropOnWrite } from '@/features/collections/invalidate'
import { queryClient } from '@/lib/query-client'
import { classify } from './classify'
import { OfflineError, ShapeError } from './errors'
import { askAgain, type AskableSet } from './freshen'
import { readSnapshot, writeSnapshot } from './snapshot'

export type SchoolCollectionSpec<T extends object, K extends string | number> = {
  /**
   * Stable for the life of the collection. It names the SQLite table and the
   * query key, so renaming it orphans everything already on somebody's device.
   */
  id: string
  /**
   * The existing service function from `src/api/<domain>/service.ts`.
   *
   * Nothing here re-implements a request. `src/api/client.ts` stays the only
   * place this app calls `fetch`, so the envelope unwrapping, the field errors
   * and the server clock all keep working exactly as they do everywhere else.
   */
  fetch: (signal?: AbortSignal) => Promise<T[]>
  getKey: (item: T) => K
  /** Bump when the row shape changes; the old table is discarded. */
  schemaVersion: number
  /**
   * Sync as soon as this module is imported, rather than when a screen asks.
   *
   * Off by default, and it matters: a collection is a module constant, so
   * eager sync means a signed-out visitor on the sign-in page fires the
   * parent portal's three requests — and a teacher pays for the admin
   * portal's. An explicit `preload()` is what starts one — the shell loaders,
   * the assignment routes and `useCollectionRows` all call it. Whether a live
   * query alone would has been claimed both ways (the library's docs say yes;
   * CLAUDE.md records a measurement that said no), so nothing relies on it.
   */
  startSync?: boolean
  /** Only for genuinely volatile sets. Most school data is not. */
  refetchInterval?: number
}

/** Every collection built here, so a sign-out can tear all of them down. */
const built = new Map<string, Collection<never, never, never>>()

/** How to ask each one for the school's version again. */
const refetchers = new Map<string, () => Promise<unknown>>()

/** Why each one last refused, for a screen that has nothing else to show. */
const lastErrors = new Map<string, () => unknown>()

/**
 * What the school last said when this set could not be synced.
 *
 * Read rather than subscribed to: a live query over the collection already
 * re-renders when it goes into `error`, and this is what the render then puts
 * on screen. Undefined once a sync succeeds.
 */
export const collectionError = (id: string): unknown => lastErrors.get(id)?.()

export const allCollections = () => [...built.values()]

export const collectionById = (id: string) => built.get(id)

/**
 * A set that holds one answer rather than a list of them.
 *
 * Several endpoints answer with a document, not a register — the student's fee
 * ledger is the bills *and* the payments taken against them, the timetable is
 * the grid *and* the class it was drawn for, the mark catalogue is the words
 * *and* which of them mean the child was in school. The list is not the answer;
 * it is one field of it, and storing the field alone throws away what the page
 * beside it reads.
 *
 * So the whole answer is kept under one key. It is still an ordinary
 * collection — persisted, live-queryable and refetched by exactly the same
 * machinery — which is why this is a thin wrapper rather than a second kind of
 * thing to learn.
 */
export type Document<T> = { id: string; doc: T }

/** The one key a document set stores its answer under. */
const THE = 'the'

export function schoolDocument<T>(spec: {
  id: string
  fetch: (signal?: AbortSignal) => Promise<T>
  schemaVersion: number
  startSync?: boolean
  refetchInterval?: number
}) {
  return schoolCollection<Document<T>, string>({
    ...spec,
    // Wrapped rather than spread, so an answer carrying an `id` of its own
    // keeps it — a document whose identity was silently overwritten by the
    // word "the" would be a long afternoon.
    fetch: async (signal) => [{ id: THE, doc: await spec.fetch(signal) }],
    getKey: () => THE,
  })
}

/**
 * Readies a document set and hands back its answer.
 *
 * The counterpart of `heldRows` below, and it preloads for the same reason: a
 * count tile or a record lookup on a cold start genuinely has to wait for the
 * first sync. Undefined only where the set synced and the school sent nothing.
 */
export async function heldDocument<T>(collection: {
  preload: () => Promise<void>
  toArrayWhenReady: () => Promise<Document<T>[]>
}): Promise<T | undefined> {
  await collection.preload()
  // As in `heldRows` below: ready is not the same moment as committed.
  return (await collection.toArrayWhenReady())[0]?.doc
}

/**
 * Readies a set and hands back what it holds.
 *
 * How anything that is not a live query reads a collection — a count tile, a
 * record lookup, a form's dropdown. `preload` is the documented way to make one
 * ready and is safe from anywhere that reads; it is only a mutation handler and
 * the outbox drain that must never call it, where it deadlocks.
 *
 * A refusal reaches the caller. A device that has synced this set before
 * answers from the copy it kept, connection or no connection, so getting an
 * error here means the school has never been reached on this device — which is
 * worth saying rather than passing off as an empty register.
 */
export async function heldRows<T extends object>(collection: {
  preload: () => Promise<void>
  toArrayWhenReady: () => Promise<T[]>
}): Promise<T[]> {
  await collection.preload()
  // `toArrayWhenReady` rather than `toArray`, which is the same race the outbox
  // hit at boot in a different place: `preload` resolving is not the same
  // moment as the rows being committed, so reading the array straight after it
  // can hand back a set that is still filling. It showed up as count tiles that
  // disagreed with the register beside them and drifted on every reload.
  return collection.toArrayWhenReady()
}

/**
 * Refetches in flight, keyed by set. See `refetchCollection`.
 */
const refetching = new Map<string, Promise<void>>()

/**
 * Refetches one collection by id, if this build has it — and **once**, however
 * many callers ask at the same moment.
 *
 * Every landed write asks for its own set twice over: `enqueue` refetches the
 * set the write was about, and `dropDerivedReads` resyncs every set the device
 * has open, which includes that one. Two calls, microseconds apart, and
 * react-query does not fold them together because each runs the collection's
 * own fetcher rather than joining a query already running.
 *
 * For a plain set that is one wasted request. For a fan-out it is a second
 * fan-out: `setQuestions` asks the school for the questions of every paper the
 * teacher has set, so adding a single question fired ten requests where five
 * would do — measured, 2026-09-16 — and the teacher waited on the slowest of
 * the ten before their own question appeared. Joining the one already running
 * is the whole fix, and it is the same saving on every write in the app.
 *
 * A rejection is shared with whoever joined it, which is what every caller
 * here already expects: each of them swallows it, because a set that could not
 * be refreshed is a stale list rather than a failure.
 */
export async function refetchCollection(id: string): Promise<void> {
  const already = refetching.get(id)
  if (already) return already

  const refetcher = refetchers.get(id)
  if (!refetcher) return

  // Cleared before the promise settles, so the next caller after this one
  // finishes starts a fresh request rather than joining a finished one.
  const run = Promise.resolve(refetcher())
    .then(() => undefined)
    .finally(() => refetching.delete(id))

  refetching.set(id, run)
  return run
}

/**
 * Readies the sets a page draws and asks the school for them again.
 *
 * What a route loader calls instead of `preload()` alone, and the reason is in
 * `freshen.ts`: `preload()` starts a sync and starting one already started
 * does nothing, so a portal asked the school once and then never again. This
 * resolves as soon as the device can answer and lets the school's answer
 * arrive into a page that is already drawn — `asked` runs after it lands, for
 * the reads that are derived from a set rather than live over it.
 */
export function freshen(
  sets: readonly (AskableSet | undefined)[],
  asked?: () => unknown,
): Promise<void> {
  return askAgain(refetchCollection, sets, asked)
}

/**
 * Asks the school again for every set on the device.
 *
 * The local-first counterpart to `dropDerivedReads`: an invalidation moves a
 * react-query cache, and a collection is not in one, so a write that changes
 * money or records has to reach these too or the reader sits looking at rows
 * the school no longer agrees with.
 *
 * Failures are swallowed on purpose. This is a refresh, and a device that
 * cannot reach the school keeps what it has — which is the whole point.
 */
export async function resyncCollections(ids?: readonly string[]): Promise<void> {
  const wanted = ids ?? [...refetchers.keys()]
  await Promise.all(
    wanted
      // A set nobody has opened is left alone. Collections sync lazily, so a
      // module being imported is not evidence anyone wants its rows — and
      // refetching an untouched one would ask for it on the strength of a
      // write to something else entirely. An admin saving a fee would fetch
      // the teacher's own subjects, which the school answers with a 403.
      .filter((id) => built.get(id)?.status !== 'idle')
      // Through `refetchCollection` rather than the refetcher directly, so a
      // set this resync shares with the write that triggered it is asked for
      // once. Calling straight past it was worth a whole second fan-out on
      // every write to a set built out of many requests.
      .map((id) => refetchCollection(id).catch(() => undefined)),
  )
}

/*
 * Every write in the app has to reach the device's own sets, not just the query
 * cache — a register read off a collection is not behind any key an
 * invalidation can drop. Registered as this module is imported, which is as
 * soon as there is a collection to resync and never before.
 *
 * Returned rather than fired, so `dropDerivedReads` can drop the reads built
 * *out of* these sets once the sets have actually caught up. Fired, the two
 * raced and the refetch won, re-reading the rows the write had just made
 * stale — see the note there.
 */
alsoDropOnWrite(() => resyncCollections())

/**
 * The one way to put a school endpoint on the device.
 *
 * Everything reachable offline goes through here, which is what makes the rule
 * in CLAUDE.md enforceable rather than aspirational: there is no second way to
 * build one, so a new endpoint either follows this shape or is visibly not
 * local-first.
 */
export function schoolCollection<T extends object, K extends string | number>(
  spec: SchoolCollectionSpec<T, K>,
) {
  const queryFn = async ({ signal }: { signal: AbortSignal }): Promise<T[]> => {
    if (!navigator.onLine) return kept()

    try {
      const rows = await spec.fetch(signal)

      // This answer is about to become the complete state of the collection,
      // so anything that is not a list of rows must stop here. A malformed
      // response read as "no rows" would empty this school's copy of the
      // register, and it would look like the register was empty.
      if (!Array.isArray(rows)) throw new ShapeError(spec.id)

      writeSnapshot(spec.id, rows)
      return rows
    } catch (error) {
      // Anything the school could not answer — a dropped connection, a 500, a
      // refused token — falls back to what it last said. A refusal still ends
      // the session, but through `/users/me` and the portal guard, which is
      // where that decision belongs; it must not also make the records already
      // on this device unreadable.
      const held = readSnapshot<T>(spec.id)
      if (held && held.length > 0) return held
      throw error
    }
  }

  /**
   * What to answer when there is no connection to ask over.
   *
   * Returning the snapshot rather than refusing is the whole mechanism: to the
   * collection this is an ordinary successful sync, so it goes `ready` with
   * every row on it and the live queries above it simply work. Refusing would
   * put it into `error` — where, as `snapshot.ts` records, it stays.
   */
  const kept = (): T[] => {
    const held = readSnapshot<T>(spec.id)
    if (held) return held
    // Never synced on this device, and no connection to sync it now.
    throw new OfflineError(spec.id)
  }

  const options = queryCollectionOptions<T, unknown, string[], K>({
    // Named rather than generated, so the collection a screen holds can be
    // traced back to its snapshot, its refetcher and its last error by the one
    // id — `use-collection-rows.ts` reads exactly that off the binding.
    id: spec.id,
    queryKey: ['db', spec.id],
    queryFn,
    queryClient,
    getKey: spec.getKey,
    startSync: spec.startSync ?? false,
    refetchInterval: spec.refetchInterval,
    staleTime: 30_000,
    // Reconnecting is the natural moment to find out what changed while the
    // device was away.
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    /**
     * Deliberately `always`, not `online`.
     *
     * Under `online` react-query pauses the request without running the
     * fetcher, so the collection is never told the attempt settled and sits in
     * `loading` for as long as the device is offline — which strands a route
     * loader waiting on `preload()`. Running the fetcher and letting it decide
     * (see the first line of `queryFn`) keeps that judgement in one place.
     */
    networkMode: 'always',
    retry: (failureCount: number, error: unknown) =>
      classify(error) === 'retryable' && failureCount < 2,
  })

  const collection = createCollection(options) as unknown as Collection<T, K, never>

  built.set(spec.id, collection as unknown as Collection<never, never, never>)
  // Kept beside the collection rather than reached through it: the registry is
  // keyed by string for the drain, and a collection read back out of a map of
  // mixed row types has no usable `utils` type left.
  refetchers.set(spec.id, () => options.utils.refetch())
  lastErrors.set(spec.id, () => options.utils.lastError)

  return collection
}
