import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { studentKeys } from '../students/keys'
import type { Id } from '../types'
import { invoiceKeys } from './keys'
import { invoicesService } from './service'
import type { InvoiceBody, InvoiceListParams, SettleInvoiceBody } from './types'

export function useInvoices(params: InvoiceListParams = {}) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => invoicesService.list(params),
  })
}

export function useInvoice(id: Id | undefined) {
  return useQuery({
    queryKey: invoiceKeys.detail(id ?? ''),
    queryFn: () => invoicesService.get(id!),
    enabled: id !== undefined,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: InvoiceBody) => invoicesService.create(body),
    meta: { success: 'Invoice created' },
    onSuccess: (_data, body) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      // The pupil's own invoice list is a different endpoint holding the same row.
      queryClient.invalidateQueries({ queryKey: studentKeys.invoices(body.student_id) })
    },
  })
}

export function useUpdateInvoice(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: InvoiceBody) => invoicesService.update(id, body),
    meta: { success: 'Invoice updated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => invoicesService.remove(id),
    meta: { success: 'Invoice deleted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
  })
}

/** Settling moves money, so both the invoice and the pupil's ledger go stale. */
export function useSettleInvoice(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SettleInvoiceBody) => invoicesService.settle(id, body),
    meta: { success: 'Invoice settled' },
    onSuccess: (_data, body) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: studentKeys.invoices(body.student_id) })
    },
  })
}

export function usePayment(paymentId: Id | undefined) {
  return useQuery({
    queryKey: invoiceKeys.payment(paymentId ?? ''),
    queryFn: () => invoicesService.payment(paymentId!),
    enabled: paymentId !== undefined,
  })
}

export function useMyInvoices() {
  return useQuery({
    queryKey: invoiceKeys.mine(),
    queryFn: () => invoicesService.mine(),
  })
}

export function useReceipt(invoiceId: Id | undefined, studentId: Id | undefined) {
  return useQuery({
    queryKey: invoiceKeys.receipt(invoiceId ?? '', studentId ?? ''),
    queryFn: () => invoicesService.receipt(invoiceId!, studentId!),
    enabled: invoiceId !== undefined && studentId !== undefined,
  })
}
