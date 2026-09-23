import type {
  CollectInvoice,
  CollectStudent,
} from '../../../../api/collect-fees/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { formatNaira } from '../../../../lib/format.ts'
import { collectRow, pupilName } from '../../collections/collect-row.ts'

/** How the results list names a pupil: who they are, then how to be sure. */
export function pupilResult(student: CollectStudent): Row {
  return {
    id: String(student.id),
    name: pupilName(student),
    regno: student.regno?.trim() || BLANK,
    placed: student.department?.trim() || BLANK,
  }
}

/**
 * One line of a pupil's ledger.
 *
 * `receipt` carries the invoice id where a slip can actually be issued, and
 * nothing where it cannot: the endpoint issues one against a recorded
 * transaction alone, and this school has invoices settled long before the
 * counter kept any — asking for their receipt is a 404 rather than a slip.
 */
export function ledgerRow(invoice: CollectInvoice): Row {
  const row = collectRow(invoice)
  const paid = (invoice.transactions ?? []).length > 0

  return {
    ...row,
    session: invoice.session?.trim() || BLANK,
    receipt: paid ? String(invoice.id) : '',
    payable: invoice.is_settled ? '' : String(invoice.id),
  }
}

/**
 * What the pupil still owes, over the invoices on screen. Summed here because
 * this endpoint totals nothing itself — unlike the counter queue, which counts
 * the whole ledger for us.
 */
export function owed(invoices: CollectInvoice[]): number {
  return invoices
    .filter((invoice) => !invoice.is_settled)
    .reduce((total, invoice) => total + (Number(invoice.amount) || 0), 0)
}

/** The three figures over a pupil's ledger. */
export function pupilTiles(invoices: CollectInvoice[]) {
  const settled = invoices.filter((invoice) => invoice.is_settled).length
  return [
    { label: 'Still owing', value: formatNaira(owed(invoices)) },
    { label: 'Invoices owing', value: String(invoices.length - settled) },
    { label: 'Settled', value: String(settled) },
  ]
}

/** The pupil as the ledger's heading names them. */
export function pupilHeading(student: CollectStudent | undefined): string {
  return student ? pupilName(student) : 'Pupil'
}

/** The line under it — the two things a counter checks a family against. */
export function pupilSubtitle(student: CollectStudent | undefined): string {
  return [student?.regno?.trim(), student?.class_arm?.trim() ?? student?.department?.trim()]
    .filter(Boolean)
    .join(' · ')
}
