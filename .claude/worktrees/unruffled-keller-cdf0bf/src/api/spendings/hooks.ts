import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id } from '../types'
import { spendingKeys } from './keys'
import { spendingsService } from './service'
import type { SpendingBody, SpendingListParams } from './types'

export function useSpendings(params: SpendingListParams = {}) {
  return useQuery({
    queryKey: spendingKeys.list(params),
    queryFn: () => spendingsService.list(params),
  })
}

export function useSpendingSummary() {
  return useQuery({
    queryKey: spendingKeys.summary(),
    queryFn: () => spendingsService.summary(),
  })
}

export function useSpending(id: Id | undefined) {
  return useQuery({
    queryKey: spendingKeys.detail(id ?? ''),
    queryFn: () => spendingsService.get(id!),
    enabled: id !== undefined,
  })
}

/** Every write shifts the ledger total and the monthly summary with it. */
export function useCreateSpending() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SpendingBody) => spendingsService.create(body),
    meta: { success: 'Spending recorded' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: spendingKeys.all }),
  })
}

export function useUpdateSpending(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SpendingBody) => spendingsService.update(id, body),
    meta: { success: 'Spending updated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: spendingKeys.all }),
  })
}

export function useDeleteSpending() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => spendingsService.remove(id),
    meta: { success: 'Spending deleted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: spendingKeys.all }),
  })
}
