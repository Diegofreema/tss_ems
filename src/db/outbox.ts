import type { MutationToast } from '../lib/mutation-toast.ts'

/**
 * A write that has been accepted on the device and not yet accepted by the
 * school.
 *
 * These outlive the tab that made them, which is the whole point and also the
 * constraint that shapes the type: everything here has to survive being
 * written to SQLite and read back by a different page load. That is why
 * `handler` is a *name* into the registry rather than the function itself — a
 * closure cannot be persisted, and a register marked on Tuesday afternoon has
 * to be sendable by whatever code is running on Wednesday morning.
 */
export type OutboxOp = {
  /** `crypto.randomUUID()`. The collection's key. */
  id: string
  /** Monotonic. The only authority on what order these go in. */
  seq: number
  /** Names an entry in `registry.ts`. See the note above. */
  handler: string
  /** The request body, as JSON. Temp ids inside are resolved at send time. */
  payload: unknown
  /** Which collection to refetch once this lands, if any. */
  collectionId: string | null
  /** The row this op is about: a real id, or `local:<uuid>` for a new one. */
  targetKey: string | null
  /** Op ids whose real ids this payload is waiting on. */
  dependsOn: string[]
  createdAt: number
  attempts: number
  /** Epoch ms. The op is not eligible before this. */
  nextAttemptAt: number
  state: OpState
  lastError: string | null
  /** The same sentence the mutation cache would have raised. */
  toast: MutationToast
  /** What this was, in the reader's words: "Register for JSS 3B, 12 May". */
  label: string
}

/**
 * - `queued`       — waiting its turn, or waiting out a backoff.
 * - `sending`      — a drain has it in flight.
 * - `failed`       — the school refused it, or something it depended on failed.
 * - `needs-review` — it was in flight when the tab died, and the endpoint is
 *                    not safe to replay blind. Only a person can say.
 * - `conflict`     — the row moved under it while it waited.
 */
export type OpState = 'queued' | 'sending' | 'failed' | 'needs-review' | 'conflict'

/** The states that still want something to happen. What the drawer shows. */
export const OPEN_STATES: readonly OpState[] = ['queued', 'sending', 'needs-review', 'conflict']

/**
 * The states a register may draw as its own rows and marks.
 *
 * Narrower than `OPEN_STATES` on purpose. A `failed` op would tell a teacher
 * a child was marked when the school refused it; a `needs-review` one was in
 * flight when the tab died and very likely *did* land, so drawing its create
 * puts a ghost row beside the school's own copy of the same record; a
 * `conflict` is a person's to resolve before it means anything. All three
 * belong to the pending-work drawer — only work still on its way belongs on
 * a register.
 */
export const DRAWN_STATES: readonly OpState[] = ['queued', 'sending']

/** Rows whose id the server has not issued yet are keyed like this. */
export const LOCAL_KEY_PREFIX = 'local:'

export const isLocalKey = (key: unknown): key is string =>
  typeof key === 'string' && key.startsWith(LOCAL_KEY_PREFIX)

export const newLocalKey = () => `${LOCAL_KEY_PREFIX}${crypto.randomUUID()}`

/**
 * The next op to send, or nothing if the queue should wait.
 *
 * Strictly in `seq` order across every collection, because writes depend on
 * each other across them — a child is added before the invoice raised against
 * them. So a retryable failure at the head *blocks*: sending op 5 before op 4
 * has landed is how a queue reorders somebody's afternoon.
 *
 * A `failed` op is different. It is never going to land, so it blocks nothing —
 * anything that genuinely needed it has already been cascaded to `failed` too.
 */
export function nextOp(ops: readonly OutboxOp[], now: number): OutboxOp | undefined {
  const ordered = [...ops].sort((a, b) => a.seq - b.seq)

  for (const op of ordered) {
    // Already in flight: one at a time, always.
    if (op.state === 'sending') return undefined
    // Settled or waiting on a person. Step over it.
    if (op.state !== 'queued') continue
    // The head is serving out a backoff, so the whole queue waits with it.
    if (op.nextAttemptAt > now) return undefined
    return op
  }

  return undefined
}

/**
 * Imported ops renumbered to sit behind whatever the queue already holds.
 *
 * A queue read back off the localStorage fallback — a session that ran before
 * the durable database had opened — carries `seq` numbers issued against an
 * empty queue, and dropping them in unchanged could tie or undercut work the
 * durable queue already numbered. So where the durable queue holds anything,
 * the imported ops keep their own relative order and follow it; where it is
 * empty — the common case, a queue orphaned by a reload — they keep the
 * numbers they were done under.
 */
export function renumberImported(
  existing: readonly OutboxOp[],
  imported: readonly OutboxOp[],
): OutboxOp[] {
  const ordered = [...imported].sort((a, b) => a.seq - b.seq)
  if (existing.length === 0) return ordered

  const base = Math.max(...existing.map((op) => op.seq))
  return ordered.map((op, index) => ({ ...op, seq: base + index + 1 }))
}

/**
 * The op ids that fail as a consequence of `failedId` failing, transitively.
 *
 * A write that names a row the school will now never create cannot itself
 * succeed, and letting it try produces a second, more confusing error about a
 * missing id rather than the first, true one.
 */
export function cascadeFrom(ops: readonly OutboxOp[], failedId: string): string[] {
  const doomed = new Set([failedId])
  let grew = true

  while (grew) {
    grew = false
    for (const op of ops) {
      if (doomed.has(op.id)) continue
      if (op.dependsOn.some((id) => doomed.has(id))) {
        doomed.add(op.id)
        grew = true
      }
    }
  }

  doomed.delete(failedId)
  return [...doomed]
}

/**
 * Rewrites the temp ids in a payload to the real ids the school issued.
 *
 * Done at send time rather than when the id arrives, so that a queue written
 * on Tuesday and drained on Wednesday resolves against whatever the map holds
 * by then. Walks the whole payload because a temp id can sit anywhere in it —
 * as the record's own id, as a foreign key, or inside a list of them.
 */
export function substitute<T>(payload: T, ids: ReadonlyMap<string, string | number>): T {
  if (isLocalKey(payload)) {
    const real = ids.get(payload)
    return (real === undefined ? payload : real) as T
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => substitute(item, ids)) as T
  }

  // Plain objects only. A Date, a File or a Blob is a value, not a shape to
  // walk, and rebuilding one from its entries would quietly destroy it.
  if (payload !== null && typeof payload === 'object' && isPlainObject(payload)) {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) out[key] = substitute(value, ids)
    return out as T
  }

  return payload
}

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * The temp ids still in a payload that the map cannot resolve.
 *
 * A non-empty answer means the op is not sendable yet: the row it names does
 * not exist under any id the school would recognise.
 */
export function unresolved(payload: unknown, ids: ReadonlyMap<string, string | number>): string[] {
  const found = new Set<string>()

  const walk = (value: unknown): void => {
    if (isLocalKey(value)) {
      if (!ids.has(value)) found.add(value)
      return
    }
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    if (value !== null && typeof value === 'object' && isPlainObject(value)) {
      Object.values(value).forEach(walk)
    }
  }

  walk(payload)
  return [...found]
}
