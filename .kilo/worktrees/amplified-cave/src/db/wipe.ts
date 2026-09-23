import { allCollections } from './collection'
import { stopDrain } from './drain'
import { dbNameFor, runtime } from './runtime'
import { SNAPSHOTS_KEY } from './snapshot'
import { ID_MAP_KEY, OUTBOX_KEY, resetStore } from './store'

/**
 * Everything SQLite leaves beside the database file.
 *
 * Removing the `.sqlite` alone is not a wipe, and this was verified the hard
 * way: after one, OPFS still held `netpro.<id>.sqlite-wal` and
 * `-journal`. **A write-ahead log holds rows** — the very records this is
 * supposed to be taking off a shared machine — so anything carrying the
 * database's name has to go with it.
 *
 * `.ahp-*` is the access-handle pool the OPFS VFS preallocates to hold the
 * database's pages. It is opaque, it is this VFS's alone, and it is where the
 * content actually lives, so it goes too.
 */
async function removeDatabaseFiles(dbName: string): Promise<void> {
  try {
    const root = await navigator.storage?.getDirectory?.()
    if (!root) return

    const doomed: string[] = []
    for await (const [name] of root.entries()) {
      if (name === dbName || name.startsWith(`${dbName}-`) || name.startsWith('.ahp-')) {
        doomed.push(name)
      }
    }

    for (const name of doomed) {
      await root.removeEntry(name, { recursive: true }).catch(() => {})
    }
  } catch {
    // Already gone, or this browser has no OPFS to clear.
  }
}

/**
 * Removes any school database on this device that is not this account's.
 *
 * A wipe can be interrupted — a closed lid, a killed tab, a browser that
 * crashed between deleting the file and deleting its log — and what it leaves
 * behind is somebody else's records under a name nothing will ever open again.
 * So the account taking the device clears them, which is the one moment we
 * know for certain who this device now belongs to.
 */
export async function removeForeignDatabases(ownerId: string): Promise<void> {
  const keep = dbNameFor(ownerId)

  try {
    const root = await navigator.storage?.getDirectory?.()
    if (!root) return

    const doomed: string[] = []
    for await (const [name] of root.entries()) {
      if (!name.startsWith('netpro.')) continue
      if (name === keep || name.startsWith(`${keep}-`)) continue
      doomed.push(name)
    }

    for (const name of doomed) {
      await root.removeEntry(name, { recursive: true }).catch(() => {})
    }
  } catch {
    // No OPFS here, so nothing was left on it either.
  }
}

/**
 * Takes the school's records off this device.
 *
 * Not optional and not deferrable. Local-first means real students, real
 * guardians and real fee balances are sitting in a file on a laptop that, in
 * most of these schools, is shared — the staff room machine, the bursar's desk.
 * Signing out has to mean the next person finds nothing.
 *
 * This app already understood the problem in one place: a student's saved
 * assignment attempt is keyed by owner for exactly this reason. This is the
 * same rule applied to everything else.
 */
export async function wipeLocalDb(): Promise<void> {
  stopDrain()

  // Stop every collection syncing and cancel what is in flight, so nothing
  // writes to a database that is about to be deleted.
  await Promise.all(
    allCollections().map((collection) => Promise.resolve(collection.cleanup?.()).catch(() => {})),
  )

  const dbName = runtime.dbName

  try {
    await runtime.close?.()
  } catch {
    // A worker that will not close cleanly must not stop the file being
    // removed below — that is the part that matters.
  }

  runtime.persistence = null
  runtime.close = null
  runtime.durable = false
  runtime.dbName = null
  runtime.ownerId = null
  resetStore()

  if (dbName) await removeDatabaseFiles(dbName)

  // The localStorage fallback, for a device that never had OPFS — or for a
  // session that ran before the database had opened. The snapshots go with
  // the queue: a snapshot is the school's own registers, and leaving that key
  // behind on a shared machine hands the next person real students, guardians
  // and fee balances, which is the very thing this wipe exists to prevent.
  try {
    globalThis.localStorage?.removeItem(OUTBOX_KEY)
    globalThis.localStorage?.removeItem(ID_MAP_KEY)
    globalThis.localStorage?.removeItem(SNAPSHOTS_KEY)
  } catch {
    // Private mode. Nothing was written there either.
  }
}
