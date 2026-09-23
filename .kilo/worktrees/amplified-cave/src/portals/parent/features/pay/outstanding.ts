import { parseNaira } from '../../../../lib/format.ts'
import type { Child } from '../../family.ts'
import type {
  GatewayConfig,
  PaymentState,
} from '../../../../api/payments/types.ts'

/** Where Credo returns the payer, with `?reference=` appended to it. */
export const DONE_PATH = '/parent/pay/done'

export type OutstandingInvoice = {
  /** The invoice's own id, which is what a payment is opened against. */
  id: string
  child: string
  fee: string
  /** What the school prints it as — "#2451". */
  invoice: string
  balance: string
  balanceValue: number
}

/**
 * Every invoice with something still to pay, across every child on the record.
 *
 * Keyed by the invoice's real id rather than its printed reference: the
 * payment endpoint takes `invoice_id`, and a "#2451" would have to be picked
 * apart to get it back.
 */
export function outstandingFor(family: Child[]): OutstandingInvoice[] {
  return family.flatMap((child) =>
    child.invoices
      .filter((invoice) => parseNaira(invoice.balance) > 0)
      .map((invoice) => ({
        id: invoice.id,
        child: child.full,
        fee: invoice.fee,
        invoice: invoice.invoice,
        balance: invoice.balance,
        balanceValue: parseNaira(invoice.balance),
      })),
  )
}

/**
 * The callback the payer is returned to.
 *
 * Built from the origin the app is actually being served from rather than
 * written down, because the API refuses one whose origin it does not list —
 * so a deployment on a new domain fails loudly there instead of silently
 * sending payers to somebody else's site.
 */
export function callbackUrl(origin: string): string {
  return `${origin}${DONE_PATH}`
}

/**
 * The warning shown above a payment, or nothing where there is none.
 *
 * A demo gateway takes no real money, and a parent who is not told that will
 * think a bill is settled when it is not. A missing key is worse — the
 * payment cannot open at all — so that is said before they try.
 */
export function gatewayWarning(config: GatewayConfig | undefined): string | null {
  if (!config) return null
  if (!config.public_key_present || !config.secret_key_present) {
    return 'This school’s payment gateway is not fully set up, so a payment may not open. The bursary can still take payment at the counter.'
  }
  if (!config.live) {
    return 'This is a demo gateway. Nothing you pay here is real money and no invoice is truly settled.'
  }
  return null
}

/** What each state of a payment means to the person who made it. */
const STATE_COPY: Record<PaymentState, { title: string; body: string }> = {
  paid: {
    title: 'Payment received',
    body: 'The invoice is settled and the receipt is with the bursary.',
  },
  failed: {
    title: 'That payment did not go through',
    body: 'Nothing has been charged. You can try the invoice again from the fees page.',
  },
  pending: {
    title: 'Payment is still clearing',
    body: 'Credo has the payment and has not settled it yet. This page keeps checking.',
  },
  initialized: {
    title: 'Waiting for the payment',
    body: 'The payment was opened but has not been completed yet. This page keeps checking.',
  },
}

export function stateCopy(status: PaymentState | undefined) {
  return status ? STATE_COPY[status] : STATE_COPY.initialized
}

/** Whether a payment has finished moving, either way. */
export function settled(status: PaymentState | undefined): boolean {
  return status === 'paid' || status === 'failed'
}
