import { request } from '../client'
import type { Id, Pagination } from '../types'
import type {
  CollectInvoice,
  CollectStats,
  CollectStudent,
  CollectionsReport,
  CollectionsReportParams,
  FindStudentParams,
  OutstandingParams,
  PaymentTaken,
  ReceiptIssued,
  StudentLedger,
  TakePaymentBody,
} from './types'

/**
 * The bursary counter. Every endpoint here is scoped to money being collected
 * over the counter rather than to the invoice register: the queue counts
 * itself, an invoice arrives with its payment history, and taking a payment
 * writes the transaction and settles the invoice in the same move.
 */
export const collectFeesService = {
  /**
   * The queue of invoices still owing. Unlike `/invoices` this one searches —
   * `q` matches a student's name or registration number — and it counts the
   * whole ledger itself, so the tiles above the list cost no extra request.
   */
  outstanding: (params: OutstandingParams = {}) =>
    request<{
      invoices: CollectInvoice[]
      stats: CollectStats
      pagination: Pagination
    }>('collect-fees', { query: { ...params } }),

  /** The four ways a counter payment may be taken, as the API names them. */
  paymentMethods: () =>
    request<{ payment_methods: Record<string, string> }>(
      'collect-fees/payment-methods',
    ).then((data) => data.payment_methods),

  /**
   * Students matching a name or registration number. `q` is required — the
   * endpoint answers 422 without one — and no match is an empty list, not an
   * error. Unlike the queue's own search this finds a student who owes nothing,
   * which is the whole point of looking one up.
   */
  findStudents: (params: FindStudentParams) =>
    request<{ students: CollectStudent[] }>('collect-fees/students', {
      query: { ...params },
    }).then((data) => data.students),

  /**
   * Everything one student has been billed, settled or not, each with the
   * payments taken against it. Current session by default; `all` widens it.
   */
  studentLedger: (studentId: Id, all = true) =>
    request<StudentLedger>(`collect-fees/students/${studentId}/invoices`, {
      query: { all: all ? 1 : undefined },
    }),

  /** One invoice with its full payment history. */
  invoice: (invoiceId: Id) =>
    request<{ invoice: CollectInvoice }>(`collect-fees/${invoiceId}`).then(
      (data) => data.invoice,
    ),

  /**
   * Writes money. `amount + discount` must equal the invoice exactly, so the
   * caller derives the amount rather than asking for it. An invoice already
   * settled is refused with 409.
   */
  pay: (invoiceId: Id, body: TakePaymentBody) =>
    request<PaymentTaken>(`collect-fees/${invoiceId}/pay`, {
      method: 'POST',
      body,
    }),

  /**
   * The slip for a payment already taken. Issued against a recorded
   * transaction and nothing else: an invoice settled before the counter
   * existed is `is_settled` with no payment behind it, and answers 404.
   */
  receipt: (invoiceId: Id) =>
    request<ReceiptIssued>(`collect-fees/${invoiceId}/receipt`),

  /** Totals and a per-method breakdown over a date range, plus every payment. */
  report: (params: CollectionsReportParams = {}) =>
    request<CollectionsReport>('collect-fees/reports', { query: { ...params } }),
}
