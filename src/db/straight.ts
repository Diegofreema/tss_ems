import { OPEN_STATES, type OutboxOp } from './outbox.ts'

/**
 * Whether a write may go on the wire instead of into the queue.
 *
 * The wire comes first, so this is mostly true — and the three ways it is not
 * are each a reason the attempt would be worse than useless:
 *
 *  - **No connection.** Nothing to carry it, and `fetch` would fail into the
 *    queue anyway a moment later, having said nothing useful in between.
 *  - **The session is already refused.** One 401 pauses the drain; a write
 *    made after it would spend a second refusal learning the same thing.
 *  - **Work is already in line.** This is the one that matters. Ops send
 *    strictly by `seq` because writes depend on each other — a child is
 *    enrolled before the invoice raised against them — so a write that went
 *    straight to the school while an earlier one sat in the queue would land
 *    out of order and ask the school about a row it has not been told about
 *    yet. Joining the back of the queue keeps the order the writes were made
 *    in, which is the order they make sense in.
 *
 * Only work still expected to land counts as "in line". A `failed` op is not
 * going anywhere without a person, and letting it block every write made after
 * it would wedge the whole app behind one refusal — which is the bug that made
 * 403 terminal in `classify.ts`, arriving here by another road.
 */
export function mayGoStraight(
  online: boolean,
  pausedForAuth: boolean,
  ops: readonly OutboxOp[],
): boolean {
  if (!online || pausedForAuth) return false
  return !ops.some((op) => OPEN_STATES.includes(op.state))
}
