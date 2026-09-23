import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { analyticsKeys } from './keys'
import { analyticsService } from './service'
import type {
  CheckRrrBody,
  PaymentListParams,
  ResultAnalyticsParams,
  RetryPaymentBody,
} from './types'

/** Enrolment counts. Answers for the whole school, so it takes no filter. */
export function useBusinessIntelligence() {
  return useQuery({
    queryKey: analyticsKeys.businessIntelligence(),
    queryFn: () => analyticsService.businessIntelligence(),
  })
}

/** Idle until both ids are known, since the endpoint requires them. */
export function useResultAnalytics(params: Partial<ResultAnalyticsParams>) {
  const ready = params.subject_id !== undefined && params.session_id !== undefined
  return useQuery({
    queryKey: analyticsKeys.results(params),
    queryFn: () => analyticsService.results(params as ResultAnalyticsParams),
    enabled: ready,
  })
}

/** Idle until a session is chosen — `session_id` is required. */
export function useFinancialAnalytics(sessionId: number | undefined) {
  return useQuery({
    queryKey: analyticsKeys.financial(sessionId),
    queryFn: () => analyticsService.financial(sessionId!),
    enabled: sessionId !== undefined,
  })
}

export function usePayments(params: PaymentListParams = {}) {
  return useQuery({
    queryKey: analyticsKeys.payments(params),
    queryFn: () => analyticsService.payments(params),
  })
}

/**
 * Both of these settle money against a live gateway, so both invalidate more
 * than the analytics: a confirmed payment moves the transaction list here and
 * the invoice register everywhere else, and `check-rrr` settles the invoice
 * itself.
 */
function useSettle<TBody>(
  run: (body: TBody) => Promise<unknown>,
  success: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    meta: { success },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}

export function useRetryPayment() {
  return useSettle<RetryPaymentBody>(
    (body) => analyticsService.retryPayment(body),
    'Interswitch was asked about that reference',
  )
}

export function useCheckRrr() {
  return useSettle<CheckRrrBody>(
    (body) => analyticsService.checkRrr(body),
    'Remita was asked about that RRR',
  )
}
