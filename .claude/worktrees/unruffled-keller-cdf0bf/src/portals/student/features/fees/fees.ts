import type { Invoice } from '../../../../api/invoices/types.ts'
import type { MyPayment } from '../../../../api/my-schooling/types.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import { money, named, SETTLED } from '../../../../features/collections/invoice.ts'
import { newestFirst } from '../../../../features/collections/newest.ts'
import { schoolTime, when } from '../../../../features/collections/when.ts'
import { capitalise, formatNaira } from '../../../../lib/format.ts'

/**
 * The pupil's fee ledger, off `GET /students/me/invoices` — which answers with
 * both halves of it: the bills, and the payments the bursary took against
 * them. Nothing else a pupil can reach says how a fee was paid.
 *
 * There is no part payment on this API: an invoice is settled whole, so what
 * has been paid against a bill is its full amount or nothing at all.
 */

/** The reference a bursar asks for on the phone; the id where none is printed. */
export function reference(invoice: Invoice): string {
  return invoice.invoiceid?.trim() || `#${invoice.id}`
}

/** What the pupil has actually paid, which the counters do not carry. */
export function paidTotal(invoices: Invoice[]): number {
  return invoices
    .filter((invoice) => invoice.paystatus === SETTLED)
    .reduce((sum, invoice) => sum + money(invoice.amount), 0)
}

export type FeeCounts = { total: number; unpaid: number; settled: number }

/**
 * How many bills the pupil has, and how many are still owing.
 *
 * Counted here rather than read off `GET /students/me/dashboard`, whose fee
 * counters are not scoped to the caller: pupil 4's dashboard says four
 * invoices with one unpaid, while both the pupil's own list and the office's
 * ledger hold the same three, all settled — the unpaid one it is counting
 * belongs to another pupil. The list is the pupil's ledger and agrees with the
 * office; the counters do not.
 */
export function feeCounts(invoices: Invoice[]): FeeCounts {
  const settled = invoices.filter((invoice) => invoice.paystatus === SETTLED).length
  return { total: invoices.length, unpaid: invoices.length - settled, settled }
}

/**
 * How the money was taken, in the school's own word for it.
 *
 * `/collect-fees/payment-methods` names these properly, and it is closed to a
 * pupil — so `cash` is shown as "Cash" rather than dropped, and any key the
 * API grows later reads the same way.
 */
function methodOf(payment: MyPayment | undefined): string {
  const gateway = payment?.pgateway?.trim()
  return gateway ? capitalise(gateway) : BLANK
}

/** The payment that settled a bill, where the school has recorded one. */
function paymentFor(payments: MyPayment[], invoice: Invoice): MyPayment | undefined {
  return payments.find((payment) => payment.invoice_id === invoice.id)
}

/**
 * One line of the pupil's own fee register.
 *
 * The panel behind it says more than the table has room for: which session the
 * bill belongs to, when it was raised, and the reference on the payment that
 * cleared it.
 */
export function invoiceRows(invoices: Invoice[], payments: MyPayment[]): Row[] {
  return newestFirst(invoices).map((invoice) => {
    const amount = money(invoice.amount)
    const settled = invoice.paystatus === SETTLED
    const payment = paymentFor(payments, invoice)

    return {
      id: String(invoice.id),
      invoice: reference(invoice),
      fee: named(invoice.fee, 'name') || `Fee ${invoice.fee_id ?? ''}`.trim(),
      amount: formatNaira(amount),
      paid: formatNaira(settled ? amount : 0),
      method: methodOf(payment),
      state: settled ? 'Paid' : 'Owing',

      // Read by the record panel rather than the table.
      session: named(invoice.session, 'name') || BLANK,
      raised: when(schoolTime(invoice.createdate)),
      settledOn: settled ? when(schoolTime(invoice.payday), true) : BLANK,
      payref: payment?.payref?.trim() || BLANK,
    }
  })
}

/**
 * The payments taken against one bill, newest first.
 *
 * The office's own note is on the slip — "payment collected by chukwudi" — and
 * it stays: it is the pupil's own receipt, and the name on it is who to ask
 * for if the payment is ever questioned.
 */
export function paymentRows(payments: MyPayment[], invoiceId: string): Row[] {
  return payments
    .filter((payment) => String(payment.invoice_id) === invoiceId)
    .sort((a, b) => Number(b.id) - Number(a.id))
    .map((payment) => ({
      id: String(payment.id),
      paidOn: when(schoolTime(payment.transdate), true),
      amount: formatNaira(money(payment.amount)),
      method: methodOf(payment),
      payref: payment.payref?.trim() || BLANK,
      note: payment.notes?.trim() || BLANK,
    }))
}
