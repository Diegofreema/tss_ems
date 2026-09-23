import type { Id } from '../types'
import type { InvoiceListParams } from './types'

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (params: InvoiceListParams) => [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: Id) => [...invoiceKeys.details(), String(id)] as const,
  payment: (paymentId: Id) => [...invoiceKeys.all, 'payment', String(paymentId)] as const,
  mine: () => [...invoiceKeys.all, 'mine'] as const,
  receipt: (invoiceId: Id, studentId: Id) =>
    [...invoiceKeys.detail(invoiceId), 'receipt', String(studentId)] as const,
}
