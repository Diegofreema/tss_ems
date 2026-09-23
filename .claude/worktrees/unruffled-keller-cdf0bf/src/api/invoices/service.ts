import { paginated, request } from '../client'
import type { Id } from '../types'
import type {
  Invoice,
  InvoiceBody,
  InvoiceListParams,
  Payment,
  SettleInvoiceBody,
} from './types'

export const invoicesService = {
  list: (params: InvoiceListParams = {}) =>
    request<Record<string, unknown>>('invoices', { query: { ...params } }).then((data) =>
      paginated<Invoice>(data, 'invoices'),
    ),

  /** Still returns for a deleted pupil, flagged `student_missing`. */
  get: (id: Id) => request<{ invoice: Invoice }>(`invoices/${id}`).then((data) => data.invoice),

  create: (body: InvoiceBody) =>
    request<{ invoice: Invoice }>('invoices', { method: 'POST', body }),

  update: (id: Id, body: InvoiceBody) =>
    request<{ invoice: Invoice }>(`invoices/${id}`, { method: 'POST', body }),

  /** Refused with 409 once paid, so a settled payment cannot be erased. */
  remove: (id: Id) => request<unknown>(`invoices/${id}`, { method: 'DELETE' }),

  /** Records an offline payment against the invoice. */
  settle: (id: Id, body: SettleInvoiceBody) =>
    request<unknown>(`invoices/${id}/settle`, { method: 'POST', body }),

  payment: (paymentId: Id) =>
    request<{ payment: Payment }>(`invoices/payments/${paymentId}`).then((data) => data.payment),

  /** The caller's own invoices — for a parent, every child's. */
  mine: () => request<{ invoices: Invoice[] }>('invoices/mine').then((data) => data.invoices),

  /** Admins, the pupil themselves, or that pupil's parent. Anyone else gets 403. */
  receipt: (invoiceId: Id, studentId: Id) =>
    request<Record<string, unknown>>(`invoices/${invoiceId}/receipt/${studentId}`),
}
