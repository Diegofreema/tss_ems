import { WRITE } from '../../../db/ids.ts'
import { DRAWN_STATES, type OutboxOp } from '../../../db/outbox.ts'
import type { Row } from '../../../features/collections/types.ts'

/**
 * What this device has queued about rows that already exist, as a lookup.
 *
 * The shape three registers wanted — a subject withdrawn, a fee retired, a
 * student suspended — so it is written once here. Later ops win, in `seq` order:
 * withdrawing a subject and then putting it back leaves it back, which is the
 * order the office did it in. Only ops still expected to land: a refused one is
 * not going to, and showing its state would tell the office something happened
 * that the school said no to. The states a person has to decide about —
 * `needs-review`, `conflict` — wait in the drawer with it.
 */
export function pendingValues<T>(
  ops: readonly OutboxOp[],
  handler: string,
  read: (payload: unknown) => { id: string; value: T } | undefined,
): ReadonlyMap<string, T> {
  const pending = new Map<string, T>()

  for (const op of [...ops].sort((one, two) => one.seq - two.seq)) {
    if (op.handler !== handler || !DRAWN_STATES.includes(op.state)) continue
    const change = read(op.payload)
    if (change) pending.set(change.id, change.value)
  }

  return pending
}

/**
 * A register's rows with the state changes this device has queued written on
 * top of them.
 *
 * Without this a queued row action reads as a button that did nothing: the op
 * is safely on the device and the row still shows what the school last said.
 * The row shows what it is about to be, and the banner and the pending-work
 * drawer are what say it has not got there yet — the same division the
 * attendance register already uses for a queued mark.
 *
 * Later ops win, in `seq` order: withdrawing a subject and then putting it back
 * leaves it back, which is the order the office did it in.
 */
export function withPendingState(
  rows: Row[],
  ops: readonly OutboxOp[],
  handler: string,
  /** The op's target row, and what that row's state becomes. */
  read: (payload: unknown) => { id: string; state: string } | undefined,
): Row[] {
  const pending = pendingValues(ops, handler, (payload) => {
    const change = read(payload)
    return change && { id: change.id, value: change.state }
  })

  if (pending.size === 0) return rows
  return rows.map((row) => {
    const state = pending.get(row.id)
    return state === undefined ? row : { ...row, status: state }
  })
}

/** The two words the subject register prints for `subjects.status`. */
export const SUBJECT_OFFERED = 'Active'
export const SUBJECT_WITHDRAWN = 'Inactive'

/**
 * Which subjects this device has queued a change of standing for, and what it
 * becomes.
 *
 * Shared by the register's overlay and the tiles above it: a page that showed
 * one subject withdrawn and "Withdrawn 0" over it would be disagreeing with
 * itself in the same eyeful.
 */
export const pendingSubjectStatus = (ops: readonly OutboxOp[]) =>
  pendingValues(ops, WRITE.setSubjectStatus, (payload) => {
    const change = payload as { id?: unknown; offered?: unknown } | null
    if (change?.id === undefined) return undefined
    return { id: String(change.id), value: Boolean(change.offered) }
  })

/** Subjects, with a queued withdrawal or reinstatement shown. */
export const withPendingSubjectStatus = (rows: Row[], ops: readonly OutboxOp[]) =>
  withPendingState(rows, ops, WRITE.setSubjectStatus, (payload) => {
    const change = payload as { id?: unknown; offered?: unknown } | null
    if (change?.id === undefined) return undefined
    return {
      id: String(change.id),
      state: change.offered ? SUBJECT_OFFERED : SUBJECT_WITHDRAWN,
    }
  })

/** The two words the calendar registers print for `is_current`. */
export const IS_CURRENT = 'Current'
export const NOT_CURRENT = 'Not current'

/**
 * Sessions or terms, with a queued "make current" shown.
 *
 * Exclusive, unlike a subject's status: making one current takes it off
 * whichever one had it, so the overlay has to move the word rather than just
 * set it. Only the last queued one counts — the office may have changed their
 * mind before any of them sent.
 */
export function withPendingCurrent(
  rows: Row[],
  ops: readonly OutboxOp[],
  handler: string,
): Row[] {
  let chosen: string | undefined

  for (const op of [...ops].sort((one, two) => one.seq - two.seq)) {
    if (op.handler !== handler || !DRAWN_STATES.includes(op.state)) continue
    chosen = String(op.payload)
  }

  if (chosen === undefined) return rows
  return rows.map((row) => ({
    ...row,
    state: row.id === chosen ? IS_CURRENT : NOT_CURRENT,
  }))
}

/** The word the fee register prints for a fee still being charged. */
export const FEE_CHARGED = 'Active'
export const FEE_RETIRED = 'Inactive'

/** Which fees this device has queued a retirement or reinstatement for. */
export const pendingFeeStatus = (ops: readonly OutboxOp[]) =>
  pendingValues(ops, WRITE.setFeeStatus, (payload) => {
    const change = payload as { id?: unknown; charged?: unknown } | null
    if (change?.id === undefined) return undefined
    return { id: String(change.id), value: Boolean(change.charged) }
  })

/** Fees, with a queued retirement or reinstatement shown. */
export const withPendingFeeStatus = (rows: Row[], ops: readonly OutboxOp[]) =>
  withPendingState(rows, ops, WRITE.setFeeStatus, (payload) => {
    const change = payload as { id?: unknown; charged?: unknown } | null
    if (change?.id === undefined) return undefined
    return {
      id: String(change.id),
      state: change.charged ? FEE_CHARGED : FEE_RETIRED,
    }
  })

/** Which students this device has queued a suspension or reinstatement for. */
export const pendingStanding = (ops: readonly OutboxOp[]) =>
  pendingValues(ops, WRITE.setStudentStanding, (payload) => {
    const change = payload as { id?: unknown; status?: unknown } | null
    if (change?.id === undefined) return undefined
    return { id: String(change.id), value: String(change.status) }
  })
