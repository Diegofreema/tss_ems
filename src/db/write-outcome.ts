/**
 * What became of a write.
 *
 * - `sent`    — the school took it, on the wire, before the call returned.
 * - `held`    — it is in the outbox: no connection, none to be had, or work
 *               already in line that this must not overtake.
 * - `refused` — the school heard it and said no. Nothing is queued; the caller
 *               still has what was typed and should keep it on screen.
 *
 * On its own in a module with no imports because both ends need it — the queue
 * that decides it and the form that reads it — and the form's module is
 * compiled for the tests too, where `src/db/drain.ts` and the `@/` aliases it
 * carries cannot be resolved.
 */
export type WriteOutcome = 'sent' | 'held' | 'refused'
