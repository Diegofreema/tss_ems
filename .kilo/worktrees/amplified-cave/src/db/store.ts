import { persistedCollectionOptions } from '@tanstack/browser-db-sqlite-persistence'
import { createCollection, localStorageCollectionOptions, type Collection } from '@tanstack/react-db'
import { renumberImported, type OutboxOp } from './outbox'
import { runtime } from './runtime'
import { importFallbackSnapshots, resetSnapshots, snapshotsReady } from './snapshot'

/**
 * A temp id and the id the school gave it.
 *
 * Kept as its own persisted set rather than on the op, because the op that
 * *created* a record and the ops that *reference* it are different rows, and
 * the reference has to be resolvable long after the creating op has gone.
 */
export type IdPair = {
  /** `local:<uuid>` */
  id: string
  real: string | number
  at: number
}

/**
 * The two sets that hold unsent work, on whatever storage this device gives us.
 *
 * OPFS when we have it. `localStorage` when we do not — these are small (an op
 * is a request body, not a register) and a browser that refuses OPFS will
 * usually still take a few kilobytes. Both are local-only collections, so a
 * plain `insert`/`update`/`delete` writes straight through and confirms
 * itself; there is no server behind either of them to wait for.
 */
/** The localStorage keys the fallback writes under. Also removed by the wipe. */
export const OUTBOX_KEY = 'netpro.outbox'
export const ID_MAP_KEY = 'netpro.id-map'

/**
 * What the store's collections were built against, so `storeMatchesRuntime`
 * can say whether they still speak for the device.
 *
 * The refs below are cached for the life of the tab, but the backing is not:
 * a boot with nobody signed in has no database to open, so a store touched
 * then is built on the localStorage fallback — and a sign-in that opens the
 * real database afterwards would otherwise leave the whole session writing to
 * the wrong place. That was measured as lost work: a queue filled offline
 * against localStorage, a reload that bound to SQLite, and the ops never seen
 * again.
 */
let builtAgainst: unknown = undefined

/** Whether the store's collections were built against what is open now. */
export const storeMatchesRuntime = (): boolean =>
  outboxRef === null || builtAgainst === runtime.persistence

function localCollection<T extends object>(
  id: string,
  storageKey: string,
  getKey: (item: T) => string,
  schemaVersion: number,
): Collection<T, string, never> {
  builtAgainst = runtime.persistence

  if (runtime.persistence) {
    return createCollection(
      persistedCollectionOptions<T, string>({
        id,
        getKey,
        persistence: runtime.persistence,
        schemaVersion,
      }),
    ) as Collection<T, string, never>
  }

  return createCollection(
    localStorageCollectionOptions<T, string>({ id, storageKey, getKey }),
  ) as unknown as Collection<T, string, never>
}

let ready = false
let outboxRef: Collection<OutboxOp, string, never> | null = null
let idMapRef: Collection<IdPair, string, never> | null = null

/** Every write this device has accepted and the school has not. */
export function outbox(): Collection<OutboxOp, string, never> {
  outboxRef ??= localCollection<OutboxOp>('outbox', OUTBOX_KEY, (op) => op.id, 1)
  return outboxRef
}

/** What the school called the rows this device named first. */
export function idMap(): Collection<IdPair, string, never> {
  idMapRef ??= localCollection<IdPair>('id-map', ID_MAP_KEY, (pair) => pair.id, 1)
  return idMapRef
}

/** The temp-to-real lookup, as `substitute` and `unresolved` want it. */
export function resolvedIds(): ReadonlyMap<string, string | number> {
  return new Map(idMap().toArray.map((pair) => [pair.id, pair.real]))
}

/**
 * Waits for both to finish reading themselves back off the disk.
 *
 * **Nothing may read the queue synchronously before this resolves.** A
 * persisted collection hydrates asynchronously, and until it has, `toArray` is
 * an empty list that is indistinguishable from an empty queue — so a drain
 * started too early finds nothing to send and stops, and an `enqueue` numbers
 * its op `1` again on top of work that is already numbered. The first loses
 * somebody's register; the second reorders it. Both are silent.
 *
 * So the boot path awaits this before React mounts, and so does a sign-in.
 */
export async function storeReady(): Promise<void> {
  await Promise.all([outbox().toArrayWhenReady(), idMap().toArrayWhenReady(), snapshotsReady()])
  await importFallbackOnce()
  ready = true
}

/**
 * Rescues what a fallback session left in localStorage into the durable store.
 *
 * Two sessions leave work there: one that ran before the database had ever
 * opened — a first visit whose download timed out — and, historically, one
 * that signed in on a boot that started signed out. Either way the rows are
 * real work under keys the durable store never reads, so the first durable
 * boot walks them in: ops renumbered behind whatever the queue already holds
 * (`renumberImported`), id pairs and snapshots only where the durable store
 * has none. Everything is matched by its own id, so a run that failed halfway
 * imports the remainder next boot rather than doubling anything; the keys are
 * only removed once a walk has finished whole.
 *
 * Runs after hydration and before `recoverInterrupted`, so an op imported in
 * the `sending` state is put back or sent to the drawer by the same code that
 * handles the durable queue's own interrupted ops.
 */
async function importFallback(): Promise<void> {
  // No durable store means the fallback *is* the store; nothing to move.
  if (!runtime.persistence) return

  try {
    const ops = await orphanedRows<OutboxOp>('outbox-import', OUTBOX_KEY, (op) => op.id)
    if (ops) {
      const missing = ops.filter((op) => !outbox().get(op.id))
      for (const op of renumberImported(outbox().toArray, missing)) outbox().insert(op)
      globalThis.localStorage?.removeItem(OUTBOX_KEY)
    }

    const pairs = await orphanedRows<IdPair>('id-map-import', ID_MAP_KEY, (pair) => pair.id)
    if (pairs) {
      for (const pair of pairs) {
        if (!idMap().get(pair.id)) idMap().insert(pair)
      }
      globalThis.localStorage?.removeItem(ID_MAP_KEY)
    }

    await importFallbackSnapshots()
  } catch (error) {
    // The keys stay for the next boot to try again; nothing is lost by
    // failing here, only by pretending it cannot happen.
    console.warn('[db] could not import work left by a fallback session:', error)
  }
}

/** One walk per session, however many callers await `storeReady` at once. */
let importing: Promise<void> | undefined
function importFallbackOnce(): Promise<void> {
  importing ??= importFallback()
  return importing
}

/** Reads one fallback key back through the collection that wrote it. */
async function orphanedRows<T extends object>(
  id: string,
  storageKey: string,
  getKey: (item: T) => string,
): Promise<T[] | undefined> {
  if (!globalThis.localStorage?.getItem(storageKey)) return undefined

  const orphaned = createCollection(
    localStorageCollectionOptions<T, string>({ id, storageKey, getKey }),
  ) as unknown as Collection<T, string, never>

  const rows = await orphaned.toArrayWhenReady()
  await Promise.resolve(orphaned.cleanup?.()).catch(() => {})
  return [...rows]
}

/** Whether the queue can be trusted to answer for itself. */
export const isStoreReady = () => ready

/**
 * Drops both, and forgets them, so the next read builds them against whatever
 * storage the next account gets.
 */
export function resetStore(): void {
  // Let go of the old collections' listeners before forgetting them — a queue
  // built against the localStorage fallback would otherwise go on reacting to
  // storage events after the durable store has taken over.
  void Promise.resolve(outboxRef?.cleanup?.()).catch(() => {})
  void Promise.resolve(idMapRef?.cleanup?.()).catch(() => {})
  outboxRef = null
  idMapRef = null
  ready = false
  importing = undefined
  resetSnapshots()
}
