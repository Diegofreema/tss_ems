import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dropMoneyReads } from '../money'
import { studentKeys } from '../students/keys'
import type { Id } from '../types'
import { feeKeys } from './keys'
import { feesService } from './service'
import type { AllocateFeeBody, FeeBody, FeeListParams } from './types'

export function useFees(params: FeeListParams = {}) {
  return useQuery({
    queryKey: feeKeys.list(params),
    queryFn: () => feesService.list(params),
  })
}

export function useFeeOptions() {
  return useQuery({
    queryKey: feeKeys.options(),
    queryFn: () => feesService.options(),
    staleTime: Infinity,
  })
}

export function useFee(id: Id | undefined) {
  return useQuery({
    queryKey: feeKeys.detail(id ?? ''),
    queryFn: () => feesService.get(id!),
    enabled: id !== undefined,
  })
}

export function useCreateFee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: FeeBody) => feesService.create(body),
    meta: { success: 'Fee created' },
    // The root: `options()` is a sibling of `lists()` and cached for ever, so
    // the new fee could not be picked for an invoice until the tab reloaded.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeKeys.all }),
  })
}

export function useUpdateFee(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: FeeBody) => feesService.update(id, body),
    meta: { success: 'Fee updated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeKeys.all }),
  })
}

export function useDeactivateFee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => feesService.deactivate(id),
    meta: { success: 'Fee deactivated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeKeys.all }),
  })
}

export function useActivateFee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => feesService.activate(id),
    meta: { success: 'Fee activated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeKeys.all }),
  })
}

/**
 * Allocating raises an invoice against every student in a cohort, so it moves
 * more than any other write in the app — see `dropMoneyReads`. The fee's own
 * register goes too: allocation counts are shown on it, and `detail(id)` alone
 * left them reading what they were before.
 */
export function useAllocateFee(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AllocateFeeBody) => feesService.allocate(id, body),
    meta: { success: 'Fee allocated — invoices raised' },
    onSuccess: () => {
      dropMoneyReads(queryClient)
      // Whose invoices were raised is a whole cohort, so every student's ledger.
      queryClient.invalidateQueries({ queryKey: studentKeys.details() })
    },
  })
}

export function useDeleteFee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, force }: { id: Id; force?: boolean }) => feesService.remove(id, force),
    meta: { success: 'Fee deleted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeKeys.all }),
  })
}
