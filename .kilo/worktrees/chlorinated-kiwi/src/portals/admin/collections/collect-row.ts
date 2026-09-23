import type {
  CollectInvoice,
  CollectStudent,
  MethodTotals,
  ReportPayment,
  TakePaymentBody,
  Transaction,
} from '../../../api/collect-fees/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import { methodLabel } from '../../../features/collections/payment-methods.ts'
import type { Row } from '../../../features/collections/types.ts'
import { formatNaira } from '../../../lib/format.ts'
import { when } from '../../../features/collections/when.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** The API sends counter money as a number; anything unreadable is nothing. */
function money(amount: number | string | null | undefined): number {
  const parsed = Number(amount)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * The student, however this endpoint spelled them.
 *
 * The queue and the report name a student whole; their own ledger sends the
 * parts. A counter still has to be told who the money is for when the student's
 * record has gone from under the invoice, so an unnameable one says so.
 */
export function studentName(
  student: CollectStudent | null | undefined,
  studentId?: number,
): string {
  const whole = student?.name?.trim()
  if (whole) return whole
  const parts = [student?.fname, student?.lname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  if (parts) return parts
  const id = student?.id ?? studentId
  return id ? `Student ${id}` : 'Deleted student'
}

/**
 * Where the student sits. The arm is the finer answer and the class the coarser
 * one; the queue sends both and a student's own ledger sends the class alone.
 */
function placedIn(student: CollectStudent | null | undefined): string {
  return text(student?.class_arm ?? student?.department)
}

/**
 * One line of the counter's queue.
 *
 * `is_settled` is the API's own verdict and is trusted over `paystatus`, which
 * carries the gateway's vocabulary — `success` for paid, `Unpaid` for not.
 * `total` is the figure itself, which the payment flow does its arithmetic on.
 */
export function collectRow(invoice: CollectInvoice): Row {
  const amount = money(invoice.amount)
  const paid = invoice.transactions?.reduce((sum, entry) => sum + money(entry.amount), 0)

  return {
    id: String(invoice.id),
    invoice: `#${invoice.id}`,
    student: studentName(invoice.student, invoice.student_id),
    regno: text(invoice.student?.regno),
    placed: placedIn(invoice.student),
    fee: text(invoice.fee),
    billed: formatNaira(amount),
    status: invoice.is_settled ? 'Paid' : 'Owing',

    // Read by the record panel and the payment flow.
    session: text(invoice.session),
    raised: when(invoice.createdate),
    settledOn: invoice.payday ? when(invoice.payday, true) : BLANK,
    collected: paid === undefined ? BLANK : formatNaira(paid),
    student_id: String(invoice.student_id ?? ''),
    total: String(amount),
    settled: invoice.is_settled ? 'yes' : '',
  }
}

/**
 * Taking a payment is offered on an invoice still owing and on no other. The
 * API refuses a second one with 409, so a settled row gets no button rather
 * than a button that always fails.
 */
export function payAction(row: Row | undefined): boolean {
  return Boolean(row) && row!.settled !== 'yes'
}

/** One payment already taken, as the history beneath an invoice reads it. */
export function transactionRow(entry: Transaction, methods?: Record<string, string>): Row {
  const stamp = typeof entry.transdate === 'string' ? entry.transdate : entry.transdate?.date

  return {
    id: String(entry.id),
    taken: when(stamp, true),
    method: methodLabel(entry.method, methods),
    amount: formatNaira(money(entry.amount)),
    discount: formatNaira(money(entry.discount)),
    // The API mints this and it is what a parent quotes back when querying a
    // payment, so it is shown in full rather than truncated.
    payref: text(entry.payref),
    notes: text(entry.notes),
  }
}

/** The form's values, all strings from the inputs and selects. */
export type FormValues = Record<string, unknown>

/** A figure typed the way money reads, as the number behind it. */
export function figure(value: unknown): number {
  const typed = String(value ?? '')
  // A minus sign read as a positive would waive money nobody asked to waive.
  if (typed.includes('-')) return 0
  const parsed = Number(typed.replace(/[^0-9.]/g, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/**
 * What the counter will actually take, given the invoice and the discount
 * granted. `amount + discount` must equal the invoice exactly — so the amount
 * is derived rather than typed, and a discount cannot be worth more than the
 * bill it is against.
 */
export function collecting(total: number, discount: unknown): { amount: number; discount: number } {
  const waived = Math.min(figure(discount), total)
  return { amount: total - waived, discount: waived }
}

/**
 * The payment as `POST /collect-fees/{id}/pay` wants it.
 *
 * The amount goes as digits alone even though the endpoint accepts "24,000",
 * and the note is left off entirely when nothing was typed rather than sent
 * as an empty string.
 */
export function paymentBody(total: number, values: FormValues): TakePaymentBody {
  const { amount, discount } = collecting(total, values.discount)
  const notes = String(values.notes ?? '').trim()

  return {
    amount: String(amount),
    discount,
    payment_method: String(values.payment_method ?? ''),
    ...(notes ? { notes } : {}),
  }
}

/** One method's line in the report's breakdown. */
export function methodTotalsRow(
  method: string,
  totals: MethodTotals,
  methods?: Record<string, string>,
): Row {
  return {
    id: method,
    method: methodLabel(method, methods),
    entries: String(totals.entries ?? 0),
    amount: formatNaira(money(totals.amount)),
    discount: formatNaira(money(totals.discount)),
  }
}

/** One payment in the report, which names the student the queue would name. */
export function reportPaymentRow(
  payment: ReportPayment,
  methods?: Record<string, string>,
): Row {
  return {
    ...transactionRow(payment, methods),
    student: studentName(payment.student),
    fee: text(payment.fee),
    invoice: `#${payment.invoice_id}`,
    // The id itself, for the link to the slip this payment was issued.
    invoiceId: String(payment.invoice_id ?? ''),
  }
}
