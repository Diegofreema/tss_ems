import { isLocalKey } from '../../db/outbox.ts'
import type { Row } from './types.ts'

/**
 * A record this device made and the school has not seen yet.
 *
 * It is recognised by its id: a row created offline is keyed `local:<uuid>`
 * until the school issues a real one, and that key is the whole difference.
 *
 * **Such a row is read-only until it syncs.** Not a convenience — it is what
 * lets the queue avoid the entire class of chained-edit bugs. Editing a record
 * the school has never heard of would queue a second op naming an id that does
 * not exist yet, so the queue would have to hold a dependency graph, resolve it
 * at send time, and unpick it when the create it depended on failed. One rule
 * here removes all of that: nothing can be built on a record until the record
 * is real.
 *
 * It is a short wait — the create is at the head of the queue and goes first —
 * and it is honest, which a form that saved into nothing would not be.
 */
export const isUnsynced = (row: Pick<Row, 'id'>): boolean => isLocalKey(row.id)

/** Why the controls are not offered, in the reader's words. */
export const UNSYNCED_REASON =
  'This is saved on your device and has not reached the school yet. It can be changed once it sends.'

/**
 * What a register may still do with a row.
 *
 * Composed rather than replacing a collection's own rule: a register that
 * already refuses to delete some of its rows — an office record only a super
 * administrator may remove — keeps that refusal, and this one is added to it.
 */
export function canChange(
  row: Row,
  allowed?: (row: Row) => boolean,
): boolean {
  return !isUnsynced(row) && (allowed?.(row) ?? true)
}
