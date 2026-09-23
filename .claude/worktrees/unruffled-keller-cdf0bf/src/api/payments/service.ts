import { request } from '../client'
import type {
  GatewayConfig,
  InitialisePaymentBody,
  InitialisedPayment,
  PaymentRecord,
} from './types'

export const paymentsService = {
  /** Which gateway, and whether its keys are in place. */
  config: () => request<GatewayConfig>('payments/credo'),

  /** Opens a payment session against one invoice. The server sets the amount. */
  initialise: (body: InitialisePaymentBody) =>
    request<InitialisedPayment>('payments/credo/initialise', { method: 'POST', body }),

  /**
   * Settles the invoice once the payer is back.
   *
   * The server asks Credo itself with the secret key — nothing the browser
   * reports about the outcome is trusted, which is why the reference is the
   * only thing sent. Idempotent: calling it twice settles nothing twice.
   */
  verify: (reference: string) =>
    request<PaymentRecord>('payments/credo/verify', {
      method: 'POST',
      body: { reference },
    }),

  /**
   * The same settlement with the reference in the path.
   *
   * Offered by the API for callback pages that would rather pass a query
   * parameter straight through. This app uses `verify` above — settling an
   * invoice is a write, and a GET that a browser or a proxy may repeat on its
   * own is the wrong shape for one.
   */
  verifyByReference: (reference: string) =>
    request<PaymentRecord>(`payments/credo/verify/${encodeURIComponent(reference)}`),

  /**
   * Where the payment has got to, read locally without touching Credo. This
   * is the one that is safe to poll.
   */
  status: (reference: string) =>
    request<PaymentRecord>(`payments/credo/${encodeURIComponent(reference)}`),
}
