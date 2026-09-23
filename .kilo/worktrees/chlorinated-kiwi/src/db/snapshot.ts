import { persistedCollectionOptions } from '@tanstack/browser-db-sqlite-persistence'
import { createCollection, localStorageCollectionOptions, type Collection } from '@tanstack/react-db'
import { runtime } from './runtime'

/**
 * The last thing the school said about each set, kept on the device.
 *
 * ## Why this exists rather than `persistedCollectionOptions` doing it
 *
 * Wrapping a query collection in the SQLite persistence layer does persist its
 * rows, but it does **not** make them readable when the fetch fails — which is
 * the only moment they are wanted. Measured, on a real device: with rows
 * already on disk and the source throwing, the collection settles into
 * `status: 'error'` with `toArray` empty and stays there, and
 * `toArrayWhenReady()` rejects. The rows are on the disk and unreachable.
 *
 * That is the documented gap the TanStack DB skill flags — it describes what a
 * `queryFn` returning `[]` does and says nothing about one that rejects — and
 * the answer turns out to be hostile. So reads do not depend on it. The
 * snapshot below is written on every successful sync and handed back by the
 * fetcher whenever the school cannot be reached, which turns "offline" into an
 * ordinary successful answer as far as the collection is concerned.
 *
 * The persistence layer is still doing real work elsewhere: the outbox and the
 * id map are local-only persisted collections, and those hydrate exactly as
 * documented. It is specifically the sync-wrapped read path that does not.
 */
export type Snapshot = {
  /** The collection's id. */
  id: string
  rows: unknown[]
  at: number
}

/**
 * Where the localStorage fallback keeps the snapshots. Named in one place
 * because three others depend on it: the fallback collection below, the wipe
 * — a snapshot is the school's own records, so a sign-out that left this key
 * behind on a shared machine would hand the next person the whole register —
 * and the import that rescues a fallback session's snapshots into the durable
 * store once one opens.
 */
export const SNAPSHOTS_KEY = 'netpro.snapshots'

let ref: Collection<Snapshot, string, never> | null = null

function collection(): Collection<Snapshot, string, never> {
  if (ref) return ref

  ref = (
    runtime.persistence
      ? (createCollection(
          persistedCollectionOptions<Snapshot, string>({
            id: 'snapshots',
            getKey: (snapshot) => snapshot.id,
            persistence: runtime.persistence,
            schemaVersion: 1,
          }),
        ) as unknown as Collection<Snapshot, string, never>)
      : (createCollection(
          localStorageCollectionOptions<Snapshot, string>({
            id: 'snapshots',
            storageKey: SNAPSHOTS_KEY,
            getKey: (snapshot) => snapshot.id,
          }),
        ) as unknown as Collection<Snapshot, string, never>)
  )

  return ref
}

/**
 * Moves snapshots a fallback session left in localStorage into the durable
 * store. Only called once a durable store is open — `store.ts` owns the
 * "is there one" decision — and only additive: a set the durable store
 * already holds is the newer answer, synced after the fallback session ended,
 * and is not overwritten by it.
 */
export async function importFallbackSnapshots(): Promise<void> {
  if (!globalThis.localStorage?.getItem(SNAPSHOTS_KEY)) return

  const orphaned = createCollection(
    localStorageCollectionOptions<Snapshot, string>({
      id: 'snapshots-import',
      storageKey: SNAPSHOTS_KEY,
      getKey: (snapshot) => snapshot.id,
    }),
  ) as unknown as Collection<Snapshot, string, never>

  for (const snapshot of await orphaned.toArrayWhenReady()) {
    if (!collection().get(snapshot.id)) collection().insert(snapshot)
  }

  await Promise.resolve(orphaned.cleanup?.()).catch(() => {})
  globalThis.localStorage?.removeItem(SNAPSHOTS_KEY)
}

export async function snapshotsReady(): Promise<void> {
  await collection().toArrayWhenReady()
}

/** What the school last said about this set, if it ever said anything. */
export function readSnapshot<T>(id: string): T[] | undefined {
  const held = collection().get(id)
  return held ? (held.rows as T[]) : undefined
}

/**
 * Records the school's answer.
 *
 * Fire-and-forget: a device that cannot write its snapshot still has the rows
 * in memory for this session, and failing the fetch over it would trade a
 * working screen for a broken one.
 */
export function writeSnapshot(id: string, rows: unknown[]): void {
  try {
    const snapshot: Snapshot = { id, rows, at: Date.now() }
    if (collection().get(id)) {
      collection().update(id, (draft) => {
        draft.rows = rows
        draft.at = snapshot.at
      })
    } else {
      collection().insert(snapshot)
    }
  } catch (error) {
    console.warn('[db] could not keep a copy of', id, error)
  }
}

export function resetSnapshots(): void {
  // Let go of the old collection's listeners before forgetting it, so a set
  // built against the localStorage fallback does not go on reacting to
  // storage events after the durable store has taken over.
  void Promise.resolve(ref?.cleanup?.()).catch(() => {})
  ref = null
}
