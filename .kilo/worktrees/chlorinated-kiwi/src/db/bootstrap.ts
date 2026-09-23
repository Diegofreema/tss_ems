import {
  BrowserCollectionCoordinator,
  createBrowserWASQLitePersistence,
  openBrowserWASQLiteOPFSDatabase,
} from '@tanstack/browser-db-sqlite-persistence'
import type { Account } from '@/api/auth/types'
import { dbNameFor, runtime } from './runtime'

/**
 * How long the app waits for the device's database before giving up and
 * starting without one.
 *
 * The number comes from measuring what is actually being waited for: the OPFS
 * worker pulls wa-sqlite, which is ~500 KB gzipped. On a warm cache that opens
 * in well under a second. On a first visit over a slow connection it does not,
 * and it must not — a blank page while half a megabyte downloads is worse than
 * the app the school already has. So a cold first visit runs in memory exactly
 * as today, the download finishes in the background, and every visit after it
 * is durable.
 */
const OPEN_TIMEOUT_MS = 1_500

/**
 * The account this device last held, read straight out of the store zustand
 * persisted it into.
 *
 * Read by hand rather than through `useSessionStore`, because this runs before
 * React and before the store's own rehydration has necessarily happened.
 */
function storedOwnerId(): string | null {
  try {
    const raw = globalThis.localStorage?.getItem('netpro.session')
    if (!raw) return null
    const account = (JSON.parse(raw) as { state?: { account?: Account | null } }).state?.account
    const id = account?.user?.id
    return id === undefined || id === null ? null : String(id)
  } catch {
    // A private window, a cleared profile, or something that is not JSON.
    // None of them are worth failing a boot over.
    return null
  }
}

/**
 * Opens the device's database, or decides to do without one.
 *
 * **This never rejects.** It is awaited before the app mounts, so a throw here
 * is a white screen — and every reason it could throw (no OPFS, private
 * browsing, a slow first download) is a reason to run in memory, not a reason
 * to refuse to run.
 */
export async function bootstrapDb(): Promise<void> {
  const ownerId = storedOwnerId()

  // Nobody is signed in on this device, so there is nothing to open yet. The
  // database is opened per account, and sign-in opens it.
  if (ownerId === null) return

  await openFor(ownerId)
}

/** Opens (or reopens) the database belonging to one account. */
export async function openFor(ownerId: string): Promise<void> {
  if (runtime.ownerId === ownerId && runtime.durable) return

  const dbName = dbNameFor(ownerId)

  try {
    const database = await withTimeout(
      openBrowserWASQLiteOPFSDatabase({ databaseName: dbName }),
      OPEN_TIMEOUT_MS,
    )

    /*
     * A school laptop gets two tabs opened on it, and two tabs writing one
     * SQLite file is how a queue becomes rubbish. The coordinator elects one
     * of them per collection over Web Locks and routes the rest through it, so
     * the tabs share one queue rather than each keeping a private idea of it.
     */
    const coordinator = new BrowserCollectionCoordinator({ dbName })

    runtime.persistence = createBrowserWASQLitePersistence({ database, coordinator })
    runtime.coordinator = coordinator
    runtime.close = async () => {
      coordinator.dispose()
      await database.close?.()
    }
    runtime.dbName = dbName
    runtime.ownerId = ownerId
    runtime.durable = true
  } catch (error) {
    // Deliberately a warning, not a toast. The reader is told by the offline
    // banner, in their own words, that work is not being saved on this device;
    // this line is for whoever is looking at the console.
    console.warn('[db] running without local persistence:', error)
    runtime.persistence = null
    runtime.coordinator = null
    runtime.close = null
    runtime.dbName = null
    runtime.ownerId = ownerId
    runtime.durable = false
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Local database did not open within ${ms}ms.`)),
      ms,
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}
