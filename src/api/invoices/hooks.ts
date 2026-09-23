import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dropMoneyReads } from '../money'
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
      dropMoneyReads(queryClient)
      // The student's own invoice list is a different endpoint holding the same row.
      queryClient.invalidateQueries({ queryKey: studentKeys.invoices(body.student_id) })
    },
  })
}

export function useUpdateInvoice(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: InvoiceBody) => invoicesService.update(id, body),
    meta: { success: 'Invoice updated' },
    onSuccess: (_data, body) => {
      dropMoneyReads(queryClient)
      queryClient.invalidateQueries({ queryKey: studentKeys.invoices(body.student_id) })
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => invoicesService.remove(id),
    meta: { success: 'Invoice deleted' },
    // Whose invoice it was is not in the body, so the students' own ledgers go
    // with everything else that reads a balance.
    onSuccess: () => {
      dropMoneyReads(queryClient)
      queryClient.invalidateQueries({ queryKey: studentKeys.details() })
    },
  })
}

/** Settling moves money — see `dropMoneyReads` for how far that reaches. */
export function useSettleInvoice(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SettleInvoiceBody) => invoicesService.settle(id, body),
    meta: { success: 'Invoice settled' },
    onSuccess: (_data, body) => {
      dropMoneyReads(queryClient)
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
