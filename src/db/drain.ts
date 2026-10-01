import type { MutationToast } from '@/lib/mutation-toast'
import { queryClient } from '@/lib/query-client'
import { dropDerivedReads } from '@/features/collections/invalidate'
import { backoffFor, classify } from './classify'
import { refetchCollection } from './collection'
import { cascadeFrom, nextOp, substitute, unresolved, type OutboxOp } from './outbox'
import { mayGoStraight } from './straight'
import { onlyOneTab } from './one-tab'
import { handlerFor, type OutboxHandler } from './registry'
import type { WriteOutcome } from './write-outcome'
import { idMap, isStoreReady, outbox, resolvedIds, storeReady } from './store'
import {
  announceFailed,
  announceHeld,
  announceNote,
  announceRefused,
  announceSaved,
  announceUnsendable,
} from './toast'

export type EnqueueSpec = {
  /** A name registered in `registry.ts`. */
  handler: string
  payload: unknown
  /** Refetched once this lands, so the row comes back as the school has it. */
  collectionId?: string | null
  /** The row this is about: a real id, or `local:<uuid>` for a new one. */
  targetKey?: string | null
  dependsOn?: string[]
  /** The same `meta` the mutation cache would have raised. */
  toast: MutationToast
  /** What this was, in the reader's words. Shown if it fails later. */
  label: string
  /**
   * The school's own answer, handed back to the screen that made the write —
   * and only where the write actually reached the school.
   *
   * It exists to close a gap the wire-first design opened: a write **held** on
   * the device is drawn at once, by the overlay every page composes off the
   * outbox, while a write the school *took* is drawn by nothing until the set
   * it belongs to has been fetched again. So a teacher with no signal saw
   * their question immediately and a teacher with a good connection waited on
   * a refetch — the app was quicker offline than on, which is nobody's idea of
   * how this should feel.
   *
   * What comes through is whatever the handler's `send` resolved with, so it
   * is the handler's own unwrapping and not a guess at the envelope. It is a
   * courtesy and not a contract: a page that reads nothing usable out of it
   * simply waits for the set, which is exactly what it does today.
   */
  onSent?: (answer: unknown) => void
  /**
   * The write carries something the queue cannot hold — a `File` has no form
   * the durable outbox can store — so it is sent now or not at all. The
   * sentence is what the writer is told when it cannot go now; the outcome is
   * `refused`, which keeps the form open with everything still in it.
   */
  wireOnly?: string
}

/**
 * Set when the school refuses the token.
 *
 * The whole queue stops rather than each op failing in turn: the work is fine,
 * the session is not, and burning thirty attendance marks against a dead token
 * would turn a sign-in problem into lost work. Cleared by a fresh sign-in, and
 * by somebody pressing "Send now" — see `sendNow`.
 */
let pausedForAuth = false
let draining = false
let timer: ReturnType<typeof setInterval> | null = null

/** Opens the pending-work drawer. Set by the shell once it is mounted. */
let openDrawer: () => void = () => {}
export const setDrawerOpener = (open: () => void) => {
  openDrawer = open
}
/** For callers the registered opener cannot reach as a prop — the header chip. */
export const openPendingWork = () => openDrawer()

/**
 * Sends a write, and keeps it on the device only if it could not be sent.
 *
 * **The wire first.** A write with a connection behind it goes straight to the
 * school and this returns when the school has answered, so a refusal is a
 * refusal on the screen that made it — with the form still open and the typing
 * still in it — rather than a row that sat on a register saying "Waiting to
 * send" over a save the school was never going to accept. The queue is what
 * happens when the wire is not there, which is what it was built for.
 *
 * It never throws. The three outcomes are all ordinary, all announced, and the
 * caller reads the one it got: `collection-form.tsx` keeps the form open on
 * `refused` and closes on the other two.
 *
 * Two things are still the queue's, and they are not exceptions to the rule so
 * much as the rule meeting facts that are older than it:
 *
 *  - **Nothing overtakes work already in line.** Ops send strictly by `seq`
 *    because writes depend on each other — a child is enrolled before an
 *    invoice is raised against them — so while anything is still waiting, this
 *    write joins the back of the queue rather than jumping it. The common case
 *    is an empty queue, and then there is nothing to jump.
 *  - **A refusal of the token keeps the work.** 401 pauses the drain and
 *    queues this write rather than losing it: the work is fine, the session is
 *    not, and the two are not the same news.
 */
export async function enqueue(spec: EnqueueSpec): Promise<WriteOutcome> {
  // The boot path and every sign-in await `storeReady()`, so by the time a
  // screen exists to call this, the queue has loaded. If that ever stops being
  // true this has to fail loudly: numbering an op against a half-loaded queue
  // silently reorders somebody's afternoon.
  if (!isStoreReady()) {
    throw new Error('A write was queued before the device had finished loading its queue.')
  }

  const handler = handlerFor(spec.handler)

  if (handler && straightToSchool()) {
    let answer: unknown

    /*
     * Only the send is in the `try`. What follows it is housekeeping — telling
     * the reader, refetching the set — and a refetch that fails is not a write
     * that failed: catching it here would classify a refused *read* as a
     * refused write and leave a saved record looking rejected.
     */
    try {
      answer = await handler.send(spec.payload as never)
    } catch (error) {
      const verdict = classify(error)

      if (verdict === 'terminal') {
        // The school heard it and said no. Queueing it would only ask the same
        // question again and put the answer somewhere the writer is not.
        announceRefused(spec.label, error)
        return 'refused'
      }

      if (verdict === 'auth') pausedForAuth = true
      if (spec.wireOnly) {
        announceUnsendable(spec.label, spec.wireOnly)
        return 'refused'
      }
      hold(spec, { tried: true, why: reasonOf(error) })
      return 'held'
    }

    landedOnTheWire(spec, handler, answer)
    return 'sent'
  }

  if (spec.wireOnly) {
    announceUnsendable(spec.label, spec.wireOnly)
    return 'refused'
  }

  hold(spec, { tried: false })
  return 'held'
}

/** This device's answer to `mayGoStraight`, read off the world it lives in. */
function straightToSchool(): boolean {
  return mayGoStraight(navigator.onLine, pausedForAuth, outbox().toArray)
}

/**
 * Keeps the write: write it down, say so, and let the drain carry it.
 *
 * `tried` is whether this write has already had its go on the wire. One that
 * has starts its backoff at the first step rather than at zero, because the
 * drain would otherwise pick it straight back up and spend a second attempt
 * on the connection that had just failed — two failures a few milliseconds
 * apart, and the school's reason overwritten by the same reason.
 */
function hold(spec: EnqueueSpec, attempt: { tried: boolean; why?: string }): OutboxOp {
  const op = queueOp(spec, attempt)
  // Said here rather than left to the drain. By the time this is called the
  // write has already been tried and could not be sent, or there was nothing
  // to try it over — either way it is genuinely being kept, which is the one
  // thing worth saying about it.
  announceHeld(spec.toast)
  void drain()
  return op
}

const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Everything `landed` does for a queued op, for one that never queued.
 *
 * Deliberately not awaited by the caller. The write is finished the moment the
 * school answers; refetching the set it belongs to and dropping what it made
 * stale are this app catching up with a fact, and the person who pressed Save
 * should not be kept in front of a form waiting for a *read* to come back.
 * Awaiting it held the record form open for a second full round trip after the
 * save had already succeeded.
 */
function landedOnTheWire(
  spec: EnqueueSpec,
  handler: OutboxHandler<never>,
  answer: unknown,
): void {
  announceSaved(spec.toast)

  // The screen that made the write, before anything is refetched. Guarded
  // because `enqueue` does not throw and a screen's own bookkeeping must not
  // be able to make it: the school has already taken this write.
  try {
    spec.onSent?.(answer)
  } catch {
    /* The write landed. What the page does with the answer is the page's. */
  }

  // Anything the school said about what it actually did. Unlike the drain's,
  // this reaches the person who wrote it, on the screen they wrote it from.
  const note = handler.note?.(answer)
  if (note) announceNote(note)

  const collectionId = handler.collectionId ?? spec.collectionId
  // Swallowed: the write landed, and a set that could not be refetched is a
  // stale list, not a lost record. The next sync picks it up.
  if (collectionId) void refetchCollection(collectionId).catch(() => undefined)
  void dropDerivedReads(queryClient)
}

/** Writes the op down. The queue's own bookkeeping, and nothing else. */
function queueOp(spec: EnqueueSpec, attempt: { tried: boolean; why?: string }): OutboxOp {
  const seqs = outbox().toArray.map((op) => op.seq)
  const now = Date.now()
  const attempts = attempt.tried ? 1 : 0

  const op: OutboxOp = {
    id: crypto.randomUUID(),
    seq: (seqs.length > 0 ? Math.max(...seqs) : 0) + 1,
    handler: spec.handler,
    payload: spec.payload,
    collectionId: spec.collectionId ?? null,
    targetKey: spec.targetKey ?? null,
    dependsOn: spec.dependsOn ?? [],
    createdAt: now,
    attempts,
    nextAttemptAt: attempts > 0 ? now + backoffFor(attempts) : now,
    state: 'queued',
    lastError: attempt.why ?? null,
    toast: spec.toast,
    label: spec.label,
  }

  outbox().insert(op)

  /*
   * A write accepted on the device makes what is derived from it stale *now*,
   * not when the school eventually hears about it — that is the whole claim
   * this app makes. A register reading a live query follows the queue by
   * itself; the figures above it are react-query, and without this they went on
   * showing the school's last answer beside a row the office had just changed.
   */
  void dropDerivedReads(queryClient)

  return op
}

/**
 * Every write is owed exactly one sentence, and it is said the moment the
 * write settles — which, now that the wire comes first, is before the screen
 * that made it has gone anywhere.
 *
 * `enqueue` says all three: "saved" when the school took it, "saved on this
 * device" when it had to be kept, and the school's own refusal when it was
 * refused. The drain says nothing about a write it inherited except when one
 * finally fails for good, because by then the reader is somewhere else and
 * `announceFailed` has to name what it was.
 *
 * It used to be decided by a stopwatch: the queue waited 1.2 seconds and, if
 * the write had not landed by then, told the reader it was being kept on the
 * device. That read the wrong thing off the clock — a round trip to this
 * school takes about a second on a perfectly good connection — so an office
 * with full signal was told its work had been held offline nearly every time
 * it saved anything. Slowness is not a failure, and it is not the device's
 * doing either.
 */

/**
 * Sends what it can, in the order it was done, and stops at the first thing it
 * cannot.
 *
 * One at a time and strictly by `seq`, across every collection — writes depend
 * on each other (a child is added before the invoice raised against them), and
 * a queue that reorders them produces errors about rows that do not exist yet.
 */
export async function drain(): Promise<void> {
  if (draining || pausedForAuth || !navigator.onLine) return
  draining = true

  try {
    // One tab sends, whoever is signed in. `draining` above is this tab's own
    // guard; the lock is the one that matters when the school laptop has two
    // tabs open on the same queue — see `one-tab.ts`.
    await onlyOneTab(sendWhatWeCan)
  } finally {
    draining = false
  }
}

async function sendWhatWeCan(): Promise<void> {

  // Cheap once it has resolved, and the difference between sending what is
  // waiting and deciding there was nothing to send.
  await storeReady()

  // Whether anything actually reached the school this pass. What a write makes
  // stale is dropped once at the end rather than after each op: a register of
  // thirty marks drains as thirty ops, and dropping every derived read thirty
  // times over would ask the school for the same answers thirty times.
  let sent = false

  try {
    for (;;) {
      const op = nextOp(outbox().toArray, Date.now())
      if (!op) break

      const handler = handlerFor(op.handler)
      if (!handler) {
        // The op names something this build no longer has. Replaying it is
        // impossible and dropping it silently would lose somebody's work, so
        // it goes to the drawer to be looked at.
        settle(op, 'needs-review', `This app no longer knows how to send "${op.handler}".`)
        continue
      }

      const ids = resolvedIds()
      const waiting = unresolved(op.payload, ids)
      if (waiting.length > 0) {
        // Whatever was going to create these has already been and gone —
        // head-of-line order guarantees it ran first — so it must have failed.
        fail(op, `Waiting on a record that was never created.`)
        continue
      }

      outbox().update(op.id, (draft) => {
        draft.state = 'sending'
      })

      try {
        const answer = await handler.send(substitute(op.payload, ids) as never)
        await landed(op, handler, answer)
        // Anything the school said about what it actually did with this. The
        // page that wrote it is long gone, so the drain is the only place left
        // that can pass it on.
        const note = handler.note?.(answer)
        if (note) announceNote(note)
        sent = true
      } catch (error) {
        if (!handleFailure(op, error)) break
      }
    }
  } finally {
    // Also on the way out of a queue that stopped part-way: what did land is
    // on the school's record whatever became of the op behind it.
    // A migrated write still makes un-migrated derived reads stale — a teacher
    // saving a topic moves a dashboard that is still on the query path — and
    // it makes the device's own sets stale too, which no invalidation reaches.
    if (sent) await dropDerivedReads(queryClient)
  }
}

/** Records the school's own id for a row this device named, then clears the op. */
async function landed(
  op: OutboxOp,
  handler: OutboxHandler<never>,
  answer: unknown,
): Promise<void> {
  const collectionId = handler.collectionId ?? op.collectionId

  if (op.targetKey?.startsWith('local:')) {
    // The handler's own reader, never a guess at the shape. Every create on
    // this API nests the record under a key of its own — `{student}`,
    // `{sparent}`, `{semester}` — so the id was read off `answer.id` and found
    // nowhere, for every queued create there has ever been. See `new-id.ts`.
    const real = handler.newId?.(answer)
    if (real !== undefined) {
      idMap().insert({ id: op.targetKey, real, at: Date.now() })
    }
  }

  outbox().delete(op.id)

  // The school's version of the row, rather than ours. Targeted, and per op,
  // because this is the set the op was actually about; everything else a write
  // makes stale is dropped once at the end of the drain.
  if (collectionId) await refetchCollection(collectionId)
}

/** True when the drain may carry on; false when the whole queue must stop. */
function handleFailure(op: OutboxOp, error: unknown): boolean {
  const verdict = classify(error)
  const message = error instanceof Error ? error.message : String(error)

  if (verdict === 'auth') {
    pausedForAuth = true
    // Back to `queued`, untouched: this attempt never counted.
    outbox().update(op.id, (draft) => {
      draft.state = 'queued'
      draft.lastError = message
    })
    return false
  }

  if (verdict === 'retryable') {
    outbox().update(op.id, (draft) => {
      draft.attempts += 1
      draft.nextAttemptAt = Date.now() + backoffFor(draft.attempts)
      draft.state = 'queued'
      draft.lastError = message
    })
    return false
  }

  fail(op, message)
  announceFailed(op.label, error, openDrawer)
  return true
}

/** Fails an op and everything that was waiting on it. */
function fail(op: OutboxOp, message: string): void {
  settle(op, 'failed', message)

  for (const id of cascadeFrom(outbox().toArray, op.id)) {
    const dependent = outbox().get(id)
    if (!dependent || dependent.state === 'failed') continue
    settle(dependent, 'failed', `Waiting on "${op.label}", which could not be saved.`)
  }
}

function settle(op: OutboxOp, state: OutboxOp['state'], message: string): void {
  outbox().update(op.id, (draft) => {
    draft.state = state
    draft.lastError = message
  })
}


/**
 * Puts back anything that was in flight when the tab died.
 *
 * An idempotent write is simply sent again. Anything else cannot be: this API
 * has no idempotency keys, so nothing on the device can tell whether the
 * school heard it, and guessing either way risks a duplicate record or a lost
 * one. It goes to the drawer for a person to decide.
 */
export function recoverInterrupted(): void {
  for (const op of outbox().toArray) {
    if (op.state !== 'sending') continue

    const idempotent = handlerFor(op.handler)?.idempotent ?? false
    outbox().update(op.id, (draft) => {
      draft.state = idempotent ? 'queued' : 'needs-review'
      if (!idempotent) {
        draft.lastError = 'This may already have been saved. Check before sending it again.'
      }
    })
  }
}

/** Sends an op the reader has looked at and told us to send. */
export function retry(id: string): void {
  outbox().update(id, (draft) => {
    draft.state = 'queued'
    draft.attempts = 0
    draft.nextAttemptAt = Date.now()
    draft.lastError = null
  })
  // Through `sendNow` rather than `drain` for the same reason the banner's
  // button is: a person pressing "try again" against a queue that is serving
  // out a backoff, or paused on a token that has since been replaced, was
  // pressing a button that returned at the first guard.
  sendNow()
}

/**
 * What a person means when they press "Send now": try it, now, whatever the
 * queue had decided to do about it.
 *
 * `drain()` on its own could not honour that, and the button was dead in every
 * state it was shown in. It returns at the `pausedForAuth` guard, which only a
 * fresh sign-in cleared; and where the head of the queue is serving out a
 * backoff, `nextOp` hands back nothing, so the pass runs and sends nothing.
 * Both are right for the timer, which is asking on its own initiative. Neither
 * is right for somebody who has looked at the banner and asked for it.
 *
 * So this clears both: the pause, because the token may well have been
 * replaced since, and the waiting, because the person in front of it knows
 * more about the connection than the backoff does. An attempt that fails for
 * the reason it failed before costs one request and no work — an auth refusal
 * burns no attempts and puts the pause straight back.
 */
export function sendNow(): void {
  pausedForAuth = false

  const now = Date.now()
  for (const op of outbox().toArray) {
    if (op.state !== 'queued' || op.nextAttemptAt <= now) continue
    outbox().update(op.id, (draft) => {
      draft.nextAttemptAt = now
    })
  }

  void drain()
}

/** Throws an op away, and everything that was waiting on it. */
export function discard(id: string): void {
  for (const dependent of cascadeFrom(outbox().toArray, id)) outbox().delete(dependent)
  outbox().delete(id)
}

/** A fresh sign-in clears the reason the queue stopped. */
export function resumeAfterSignIn(): void {
  pausedForAuth = false
  void drain()
}

export const isPausedForAuth = () => pausedForAuth

/**
 * Starts the queue watching for its chance.
 *
 * Reconnecting is the moment that matters; the interval is for the connection
 * that comes back without the browser noticing, and for backoffs coming due.
 */
export async function startDrain(): Promise<void> {
  if (timer !== null) return

  await storeReady()
  recoverInterrupted()

  // Once for the life of the tab: the drain is stopped and started again when
  // a sign-in rebinds the store, and a listener added per start would fire the
  // drain twice for one reconnection.
  if (!listeningForOnline) {
    listeningForOnline = true
    globalThis.addEventListener?.('online', () => void drain())
  }
  timer = setInterval(() => {
    if (outbox().toArray.length > 0) void drain()
  }, 15_000)

  void drain()
}

let listeningForOnline = false

export function stopDrain(): void {
  if (timer !== null) clearInterval(timer)
  timer = null
  draining = false
}
