import type { Collection } from '@tanstack/react-db'
import type { OutboxOp } from '../../db/outbox.ts'
import type { ListParams, Row } from './types.ts'

/**
 * A collection with its row type forgotten.
 *
 * `CollectionDef` is passed along by every registry, route and component in the
 * portals, and giving it a type parameter would spread one to all of them for
 * the sake of a field most definitions do not have. So the binding is opaque
 * here and typed at the one place it is built — `localFirst` below, which is
 * the only cast in the bridge.
 */
type OpaqueCollection = Collection<Record<string, unknown>, string | number, never>


/**
 * Where a register's rows come from when they come from the device.
 *
 * A definition carrying one of these is read with a live query over the
 * collection rather than a request, so it draws on a device with no connection
 * and redraws by itself when a sync — or a write coming off the outbox —
 * changes what is stored.
 */
export type LocalFirstBinding = {
  /** The set behind the register. */
  entities: OpaqueCollection
  /**
   * A second set the rows need in order to name something on the first — a
   * topic holds a subject id and only the subject list can put a name to it.
   *
   * Two named slots rather than a list of them because the number of hooks a
   * render makes cannot vary, and the bridge spends one live query per slot.
   * A third join wants a `createLiveQueryCollection` of its own rather than a
   * third slot.
   */
  lookup?: OpaqueCollection
  /**
   * A third set, where a row is made of three.
   *
   * Two named slots became three when the staff register wanted teachers, the
   * office records beside them and the catalogue that names an office account's
   * role — the list sends a `role_id` and expands nothing. Named slots rather
   * than a list because the number of hooks a render makes cannot vary, and
   * `useCollectionRows` spends one live query per slot. A fourth join wants a
   * `createLiveQueryCollection` of its own rather than a fourth slot.
   */
  alsoLookup?: OpaqueCollection
  /**
   * Everything the register shows, in the order it shows it.
   *
   * The ordering is not optional and is never inherited. A collection is keyed,
   * and hands its rows back in key order whatever order the endpoint sent them
   * in — measured, not assumed — so a register whose footer says "Newest first"
   * has to say so again here or it quietly stops being true.
   *
   * Searching and paging are not done here: `pageRows` does both afterwards,
   * exactly as it does for a register read from the API, so a bound definition
   * and an unbound one hand the page the same shape.
   */
  rows: (
    entities: readonly unknown[],
    lookup: readonly unknown[],
    alsoLookup: readonly unknown[],
  ) => Row[]
  /**
   * The dropdowns beside the search box, applied to the rows.
   *
   * Only for a register whose filters were already worked out on the rows
   * rather than sent to the endpoint — the shelf's "Lending", the borrowing
   * register's "Standing". A filter that is genuinely a query parameter cannot
   * be moved here by writing one of these: the set on the device would have to
   * hold every answer the parameter could give.
   *
   * Runs after `rows` and before the search and the paging, so the count beside
   * the search still reads "matches of all" — `all` being the whole set, which
   * a device that holds it can say exactly rather than remember.
   */
  narrow?: (rows: Row[], filters: ListParams['filters']) => Row[]
  /**
   * Records made on this device that the school has not seen yet.
   *
   * Read from the outbox rather than written into the collection: an optimistic
   * write is wiped by the next sync, which for a register is any refetch before
   * the op lands, whereas a row read from the queue exists exactly as long as
   * its op does and disappears when the school's own answer replaces it.
   *
   * These carry a `local:` id, which is what marks them unsynced and therefore
   * read-only — see `unsynced.ts`. They are shown ahead of the register, since
   * what somebody just wrote is what they are looking for.
   */
  queued?: (ops: readonly OutboxOp[]) => Row[]
  /**
   * The register's own rows, with whatever this device has queued *about* them
   * written on top.
   *
   * `queued` is for records that do not exist yet; this is for changes to ones
   * that do — a subject withdrawn, a session made current. Without it a queued
   * row action reads as a button that did nothing: the op is safely on the
   * device and the row still shows what the school last said.
   *
   * Runs after `rows` and before `narrow`, so a row whose status has just been
   * changed is filtered by the status it is changing *to*, which is the one on
   * screen.
   */
  overlay?: (rows: Row[], ops: readonly OutboxOp[]) => Row[]
}

/**
 * Binds a definition to a collection, checking it against the real row type.
 *
 * The definition stores the opaque result; everything the caller writes is
 * type-checked here against what the collection actually holds.
 */
export function localFirst<
  T extends object,
  K extends string | number,
  L extends object = never,
  LK extends string | number = string | number,
  M extends object = never,
  MK extends string | number = string | number,
>(spec: {
  entities: Collection<T, K, never>
  lookup?: Collection<L, LK, never>
  alsoLookup?: Collection<M, MK, never>
  rows: (entities: T[], lookup: L[], alsoLookup: M[]) => Row[]
  narrow?: (rows: Row[], filters: ListParams['filters']) => Row[]
  queued?: (ops: readonly OutboxOp[]) => Row[]
  overlay?: (rows: Row[], ops: readonly OutboxOp[]) => Row[]
}): LocalFirstBinding {
  // A collection is invariant in the type it holds and in the type it keys by,
  // so the key is a parameter here rather than the `string | number` the
  // opaque form uses — otherwise a collection keyed by number, which is every
  // one of ours, would not be accepted at all.
  return {
    entities: spec.entities as unknown as OpaqueCollection,
    lookup: spec.lookup as unknown as OpaqueCollection | undefined,
    alsoLookup: spec.alsoLookup as unknown as OpaqueCollection | undefined,
    rows: (entities, lookup, alsoLookup) =>
      spec.rows(entities as T[], lookup as L[], alsoLookup as M[]),
    narrow: spec.narrow,
    queued: spec.queued,
    overlay: spec.overlay,
  }
}
