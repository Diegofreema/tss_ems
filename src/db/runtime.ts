import type {
  BrowserCollectionCoordinator,
  PersistedCollectionPersistence,
} from '@tanstack/browser-db-sqlite-persistence'

/**
 * Where the device's database is reached from.
 *
 * A module-scope holder rather than React context, for the same reason
 * `queryClient` is one: collection definitions are module constants built
 * before React runs, and a route loader can ask for rows before the first
 * render. Set once by `bootstrapDb()`, read everywhere.
 */
type Runtime = {
  /**
   * The OPFS-backed store, or null when this browser cannot give us one —
   * private browsing, an old Safari, or a first visit that has not finished
   * downloading half a megabyte of SQLite yet.
   */
  persistence: PersistedCollectionPersistence | null
  /**
   * Whether anything written now will still be here after a reload. The
   * offline banner says something different when this is false, because
   * promising somebody their register is safe when it is not is worse than
   * telling them to keep the tab open.
   */
  durable: boolean
  /** `netpro.<userId>.sqlite`. Per account, so a wipe cannot cross one. */
  dbName: string | null
  /** The account the open database belongs to. */
  ownerId: string | null
  /**
   * What keeps two tabs from writing the same file at once.
   *
   * Elects one tab per collection over Web Locks and routes the others' writes
   * to it over a BroadcastChannel, so the tabs see each other's rows instead of
   * each holding its own idea of the queue. Null where the database is not
   * durable, since there is nothing to coordinate.
   */
  coordinator: BrowserCollectionCoordinator | null
  /** Closes the worker and its database handle. */
  close: (() => Promise<void>) | null
}

export const runtime: Runtime = {
  persistence: null,
  durable: false,
  dbName: null,
  ownerId: null,
  coordinator: null,
  close: null,
}

/** The database file for an account. */
export const dbNameFor = (ownerId: string) => `netpro.${ownerId}.sqlite`
