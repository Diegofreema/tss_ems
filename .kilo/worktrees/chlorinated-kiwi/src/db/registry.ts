import type { Id } from '../api/types.ts'

/**
 * What each queued write actually does when its turn comes.
 *
 * A queued op names its handler by string rather than holding the function,
 * because the op outlives the page that made it: a register marked on Tuesday
 * afternoon is sent by whatever code is running on Wednesday morning, and a
 * closure cannot be written to SQLite. So the op stores a name and this map
 * turns it back into behaviour.
 *
 * This is also where the rule in CLAUDE.md has teeth. A new endpoint that
 * wants to be writable offline has to register here; there is no other way to
 * get into the queue.
 */
type Sends<P> = {
  /** Sends it. The existing `src/api/<domain>/service.ts` function. */
  send: (payload: P) => Promise<unknown>
  /** The collection to refetch once it lands, so the row comes back as saved. */
  collectionId?: string
  /**
   * Something in the school's answer the person who wrote this needs told.
   *
   * A queued write's response comes back to the drain, not to the page that
   * made it — hours later, on another screen — so anything the endpoint says
   * about what it did has nowhere else to go. Returning nothing is the normal
   * case and says nothing.
   */
  note?: (answer: unknown) => string | undefined
}

/**
 * A write, and — where it creates a row — where the school's id for that row
 * is in the answer.
 *
 * `newId` is required of everything that is not idempotent and refused of
 * everything that is, which is the same line drawn twice: a write that makes
 * a new row is exactly the write whose id the device could not know in
 * advance. It is a required field rather than an optional one because the
 * reader it replaced guessed — it read `answer.id`, no create on this API
 * answers in that shape, and so every queued create landed at the school and
 * recorded nothing, silently, for as long as nothing happened to need the id.
 * Now the next create added to this file does not compile until somebody has
 * looked at what the endpoint actually says. See `new-id.ts`.
 */
export type OutboxHandler<P = never> =
  | (Sends<P> & {
      /**
       * Sending the same payload twice is the same as sending it once — an
       * upsert keyed on something the client already knows, like taking a
       * register for an arm and a date. An op of this kind that was in flight
       * when the tab died is simply sent again.
       */
      idempotent: true
      /** Nothing is created, so there is no id for the device to learn. */
      newId?: never
    })
  | (Sends<P> & {
      /**
       * This makes a new row with a server-issued id, so a replay makes a
       * second one. An op of this kind that was in flight when the tab died
       * has to be put to a person: the API has no idempotency keys, and
       * nothing on the device can tell whether the school heard it.
       */
      idempotent: false
      /** Where the id the school just issued is. See `new-id.ts`. */
      newId: (answer: unknown) => Id | undefined
    })

const handlers = new Map<string, OutboxHandler<never>>()

export function registerHandler<P>(name: string, handler: OutboxHandler<P>): void {
  if (handlers.has(name)) {
    throw new Error(`Two outbox handlers are registered as "${name}".`)
  }
  handlers.set(name, handler as OutboxHandler<never>)
}

export function handlerFor(name: string): OutboxHandler<never> | undefined {
  return handlers.get(name)
}

/** Test seam. Nothing in the app calls this. */
export function clearHandlers(): void {
  handlers.clear()
}
