import type { Receipt } from '../../../../api/collect-fees/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import { formatNaira } from '../../../../lib/format.ts'
import { methodLabel } from '../../../../features/collections/payment-methods.ts'
import { pupilName } from '../../collections/collect-row.ts'
import { when } from '../../../../features/collections/when.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/**
 * The slip's body, in the order a receipt is read: who it is for, what it was
 * for, and what was actually handed over.
 *
 * The discount line is left out when nothing was waived — a receipt reading
 * "Discount ₦0" invites the question of why it is there at all.
 */
export function receiptLines(
  receipt: Receipt | undefined,
  methods?: Record<string, string>,
): { label: string; value: string }[] {
  if (!receipt) return []

  return [
    { label: 'Pupil', value: pupilName(receipt.student) },
    { label: 'Reg. no.', value: text(receipt.student?.regno) },
    { label: 'Class', value: text(receipt.student?.department) },
    { label: 'Fee', value: text(receipt.fee) },
    { label: 'Session', value: text(receipt.session) },
    { label: 'Method', value: methodLabel(receipt.method, methods) },
    ...(receipt.discount
      ? [{ label: 'Discount granted', value: formatNaira(receipt.discount) }]
      : []),
    { label: 'Invoice settled for', value: formatNaira(receipt.total_settled) },
    { label: 'Received', value: when(receipt.issued_at, true) },
    ...(receipt.notes?.trim()
      ? [{ label: 'Note', value: receipt.notes.trim() }]
      : []),
  ]
}

/**
 * What the slip is worth. The amount collected, not what the invoice was
 * closed for — a discount is not money the school took.
 */
export function receiptTotal(receipt: Receipt | undefined): string {
  return formatNaira(receipt?.amount ?? 0)
}

/** The file a saved slip is named after, so a folder of them sorts sensibly. */
export function receiptFilename(receipt: Receipt | undefined): string {
  return `receipt-${receipt?.reference ?? 'unknown'}`
}
