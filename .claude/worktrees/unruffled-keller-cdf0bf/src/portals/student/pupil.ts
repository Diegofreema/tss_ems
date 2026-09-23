import type { Invoice } from '../../api/invoices/types.ts'
import type { Student } from '../../api/my-schooling/types.ts'
import { feeCounts } from './features/fees/fees.ts'

/**
 * The two things the pupil's own pages say about them beside their name: what
 * class they are in, and whether the office is still waiting on a fee.
 */

/**
 * The arm is the more particular of the two, and the one a pupil would name if
 * asked; the class the office filed them under stands in where no arm is set.
 */
export function armOf(student: Student): string | undefined {
  return student.class_arm?.arm_name ?? student.department?.name
}

export type FeeStanding = { label: string; owing: boolean }

/**
 * Where the pupil stands on fees, counted from their own bills.
 *
 * `GET /students/me/dashboard` is not the place to count this: its fee
 * counters are not scoped to the caller. Pupil 4's says four invoices with one
 * unpaid while their ledger — and the office's, which is the same three rows —
 * is settled in full; the bill it counts is another pupil's. A tag telling a
 * pupil they owe money they do not is the one wrong answer that matters here.
 */
export function feeStanding(invoices: Invoice[] | undefined): FeeStanding | null {
  if (!invoices?.length) return null

  const { unpaid } = feeCounts(invoices)
  if (unpaid === 0) return { label: 'Fees cleared', owing: false }
  return { label: `${unpaid} invoice${unpaid === 1 ? '' : 's'} unpaid`, owing: true }
}
