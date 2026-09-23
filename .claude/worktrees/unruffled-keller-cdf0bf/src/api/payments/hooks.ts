import { useMutation, useQuery } from '@tanstack/react-query'
import { paymentKeys } from './keys'
import { paymentsService } from './service'
import type { InitialisePaymentBody, PaymentState } from './types'

/** How often a payment that has not settled yet is asked about. */
const POLL = 4_000

/** The two states nothing moves out of. */
const FINAL: PaymentState[] = ['paid', 'failed']

/**
 * Which gateway the school is on.
 *
 * `retry: false` and never awaited: this only decides whether a payment is
 * badged as a demo, and a school whose gateway config cannot be read should
 * still be able to pay. The page treats a failure as "not known to be demo".
 */
export function useGatewayConfig() {
  return useQuery({
    queryKey: paymentKeys.config(),
    queryFn: () => paymentsService.config(),
    retry: false,
    // It changes when the school switches gateways, not during a visit.
    staleTime: 10 * 60_000,
  })
}

/**
 * Opens the payment and hands back where to send the payer.
 *
 * No invalidation: nothing has been paid yet. The invoice is still owing
 * until the payer comes back and `verify` says otherwise.
 */
export function useInitialisePayment() {
  return useMutation({
    mutationFn: (body: InitialisePaymentBody) => paymentsService.initialise(body),
    meta: { success: 'Taking you to the payment page' },
  })
}

/**
 * Settles the invoice behind a reference.
 *
 * Invalidates nothing on its own — what a settled invoice changes depends on
 * who is looking at it, so the page that calls this says so. A refusal is
 * announced by the mutation cache like any other; 402 means the payment did
 * not cover the invoice.
 */
export function useVerifyPayment() {
  return useMutation({
    mutationFn: (reference: string) => paymentsService.verify(reference),
    meta: { success: 'Payment confirmed' },
  })
}

/**
 * Where a payment has got to, polled until it settles one way or the other.
 *
 * This is the local read, not the gateway one — it costs the school nothing
 * to ask, which is what makes polling it reasonable at all. Idle without a
 * reference.
 */
export function usePaymentStatus(reference: string | null) {
  return useQuery({
    queryKey: paymentKeys.status(reference ?? ''),
    queryFn: () => paymentsService.status(reference!),
    enabled: Boolean(reference),
    refetchInterval: (query) => {
      const state = query.state.data?.status
      // Stop the moment it is settled, and stop asking an endpoint that has
      // already refused rather than refusing on a timer for ever.
      if (query.state.error || (state && FINAL.includes(state))) return false
      return POLL
    },
  })
}
