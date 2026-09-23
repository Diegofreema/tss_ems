import type { Id } from '../types'
import type { FeeListParams } from './types'

export const feeKeys = {
  all: ['fees'] as const,
  lists: () => [...feeKeys.all, 'list'] as const,
  list: (params: FeeListParams) => [...feeKeys.lists(), params] as const,
  options: () => [...feeKeys.all, 'options'] as const,
  details: () => [...feeKeys.all, 'detail'] as const,
  detail: (id: Id) => [...feeKeys.details(), String(id)] as const,
}
