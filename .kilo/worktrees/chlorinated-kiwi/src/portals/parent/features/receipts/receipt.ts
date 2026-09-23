import type { Receipt } from '../../../../api/collect-fees/types.ts'
import type { Parent } from '../../../../api/parents/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import { methodLabel } from '../../../../features/collections/payment-methods.ts'
import { when } from '../../../../features/collections/when.ts'
import { formatNaira } from '../../../../lib/format.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/**
 * Who the slip says paid: the household, named as the school holds it. Both
 * guardians where it holds both, because either of them may be the one reading
 * the receipt back to the bursary.
 */
export function paidBy(record: Parent | undefined): string {
  const names = [record?.fathersname, record?.mothersname]
    .map((name) => name?.trim())
    .filter(Boolean)
  return names.join(' & ') || 'This household'
}

/**
 * The slip's body, in the order a parent reads a receipt: who paid, who it was
 * for, what for, and how.
 *
 * Three lines only appear when they say something. A receipt reading
 * "Discount ₦0" invites the question of why it is there; "Invoice settled for"
 * repeated under an identical amount is noise, and only means anything where a
 * discount made the two differ.
 */
export function receiptFields(
  receipt: Receipt,
  household: Parent | undefined,
  methods?: Record<string, string>,
): { label: string; value: string }[] {
  return [
    { label: 'Received from', value: paidBy(household) },
    { label: 'On behalf of', value: text(receipt.student?.name) },
    { label: 'For', value: text(receipt.fee) },
    { label: 'Session', value: text(receipt.session) },
    { label: 'Method', value: methodLabel(receipt.method, methods) },
    { label: 'Date', value: when(receipt.issued_at, true) },
    ...(receipt.discount
      ? [
          { label: 'Discount granted', value: formatNaira(receipt.discount) },
          { label: 'Invoice settled for', value: formatNaira(receipt.total_settled) },
        ]
      : []),
    ...(receipt.notes?.trim() ? [{ label: 'Note', value: receipt.notes.trim() }] : []),
  ]
}
