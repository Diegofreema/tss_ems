import { request } from '../client'
import type {
  BusinessIntelligence,
  CheckRrrBody,
  FinancialAnalytics,
  PaymentList,
  PaymentListParams,
  ResultAnalytics,
  ResultAnalyticsParams,
  RetryPaymentBody,
} from './types'

export const analyticsService = {
  /** Admitted-student counts, broken down four ways. Takes no parameters. */
  businessIntelligence: () => request<BusinessIntelligence>('admins/business-intelligence'),

  /** Both ids are required; the endpoint refuses without them. */
  results: (params: ResultAnalyticsParams) =>
    request<ResultAnalytics>('admins/result-analytics', { query: { ...params } }),

  financial: (sessionId: number) =>
    request<FinancialAnalytics>('admins/financial-analytics', {
      query: { session_id: sessionId },
    }),

  /**
   * Settled transactions only — nothing pending appears here. Handed on
   * whole because which key carries the rows has never been seen; see
   * `PaymentList`.
   */
  payments: (params: PaymentListParams = {}) =>
    request<PaymentList>('admins/payments', { query: { ...params } }),

  /** Interswitch. Settles the transaction locally if the reference confirms. */
  retryPayment: (body: RetryPaymentBody) =>
    request<unknown>('admins/payments/retry', { method: 'POST', body }),

  /** Remita. Settles the transaction *and* its linked invoice if confirmed. */
  checkRrr: (body: CheckRrrBody) =>
    request<unknown>('admins/payments/check-rrr', { method: 'POST', body }),
}
