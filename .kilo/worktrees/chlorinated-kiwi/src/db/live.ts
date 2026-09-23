import { useLiveQuery } from '@tanstack/react-db'
import type { Collection } from '@tanstack/react-db'
import type { Document } from './collection'

/**
 * Reading a set from a component.
 *
 * Every screen that draws a set does the same three things with it — waits for
 * an answer, notices when there will never be one, and reads the rows — so they
 * are named once here rather than spelled out per page.
 *
 * `pending` is only true before the set has answered *either way*. A set that
 * refused is not pending: it is a set this device has never synced and cannot
 * sync now, which is a thing to say rather than a thing to spin on.
 */
export type Held<T> = {
  rows: T[]
  pending: boolean
  /** Never synced on this device, and no connection to sync it now. */
  failed: boolean
}

export function useHeld<T extends object, K extends string | number>(
  collection: Collection<T, K, never>,
): Held<T> {
  const live = useLiveQuery({ query: (q) => q.from({ row: collection }) })
  return {
    rows: (live.data ?? []) as T[],
    pending: !live.isReady && !live.isError,
    failed: live.isError,
  }
}

/** The same, for a set that holds one answer rather than a list. See `schoolDocument`. */
export function useHeldDocument<T extends object>(
  collection: Collection<Document<T>, string, never>,
): { doc: T | undefined; pending: boolean; failed: boolean } {
  const { rows, pending, failed } = useHeld(collection)
  return { doc: rows[0]?.doc, pending, failed }
}
