import type { Invoice, InvoiceBody } from '../../../api/invoices/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'
import { money, named, SETTLED } from '../../../features/collections/invoice.ts'
import { when } from '../../../features/collections/when.ts'
import { formatNaira } from '../../../lib/format.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** A foreign key as a select's value. A missing or zero id is no choice at all. */
function id(value: number | null | undefined): string {
  return value ? String(value) : ''
}

/**
 * The word the register shows for a `paystatus`.
 *
 * The API answers `success` for a settled invoice and `Unpaid` for one still
 * owing — two different vocabularies in one column. Only the first needs
 * translating, and any third word this API grows is shown as it sends it
 * rather than guessed at.
 */
export function payStatus(paystatus: string | null | undefined): string {
  const word = paystatus?.trim()
  if (!word) return BLANK
  return word === SETTLED ? 'Paid' : word
}

/**
 * Who the invoice is against. The pupil's row can be deleted out from under
 * an invoice — the API flags that rather than dropping the invoice — and a
 * bill nobody can be named for still has to be listed, so it says so.
 */
function billedTo(invoice: Invoice): string {
  const student = invoice.student
  const name = [named(student, 'fname'), named(student, 'mname'), named(student, 'lname')]
    .filter(Boolean)
    .join(' ')
  if (name) return name
  return invoice.student_id ? `Pupil ${invoice.student_id}` : 'Deleted pupil'
}

/**
 * One line of the invoice register.
 *
 * There is no part payment in this API: `settle` marks the whole invoice paid
 * in one move, so what has been paid is the full amount or nothing at all.
 *
 * `billed` and `paid` are written the way money reads; `amount` is the figure
 * itself, keyed as the endpoint keys it, which is what the edit form prefills
 * from.
 */
export function invoiceRow(invoice: Invoice): Row {
  const amount = money(invoice.amount)
  const settled = invoice.paystatus === SETTLED

  return {
    id: String(invoice.id),
    // Every invoice has an identity even before the API prints a reference on
    // it, and a dash in this column would leave the row unnameable in a toast.
    invoice: invoice.invoiceid?.trim() || `#${invoice.id}`,
    student: billedTo(invoice),
    fee: text(named(invoice.fee, 'name')),
    billed: formatNaira(amount),
    paid: formatNaira(settled ? amount : 0),
    status: payStatus(invoice.paystatus),

    // Read by the record panel, the row action and the edit form.
    arm: text(named(invoice.student?.class_arm as Record<string, unknown>, 'arm_name')),
    session: text(named(invoice.session, 'name')),
    raised: when(invoice.createdate),
    settledOn: settled ? when(invoice.payday, true) : BLANK,
    student_id: id(invoice.student_id),
    fee_id: id(invoice.fee_id),
    amount: String(amount),
  }
}

/**
 * Settling is a one-way door — there is no un-settle endpoint — so the button
 * is offered only on an invoice still owing, and a settled row gets none.
 *
 * One word, because the confirm builds its title and its button out of it:
 * "Settle this invoice?" reads, "Mark paid this invoice?" does not.
 */
export function settleAction(status: string): string | undefined {
  return status === 'Paid' ? undefined : 'Settle'
}

/** The form's values, all strings from the inputs and selects. */
export type FormValues = Record<string, unknown>

function asId(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/**
 * The invoice form as `POST /invoices` wants it.
 *
 * The amount is typed the way money reads and sent as the digits alone. The
 * reference is left out entirely — the API generates `TSS1/16` itself — and so
 * is the session where the school has not set a current one, since sending a
 * zero would file the invoice under a session that does not exist.
 */
export function invoiceBody(values: FormValues, sessionId?: number): InvoiceBody {
  return {
    fee_id: asId(values.fee_id),
    student_id: asId(values.student_id),
    amount: String(values.amount ?? '').replace(/[^0-9.]/g, ''),
    session_id: sessionId,
  }
}
