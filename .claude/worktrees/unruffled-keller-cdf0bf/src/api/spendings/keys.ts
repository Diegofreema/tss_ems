import type { Id } from '../types'
import type { SpendingListParams } from './types'

export const spendingKeys = {
  all: ['spendings'] as const,
  lists: () => [...spendingKeys.all, 'list'] as const,
  list: (params: SpendingListParams) => [...spendingKeys.lists(), params] as const,
  summary: () => [...spendingKeys.all, 'summary'] as const,
  detail: (id: Id) => [...spendingKeys.all, 'detail', String(id)] as const,
}
