import type { Id } from '../types'
import type { LogListParams } from './types'

export const logKeys = {
  all: ['logs'] as const,
  list: (params: LogListParams) => [...logKeys.all, 'list', params] as const,
  types: () => [...logKeys.all, 'types'] as const,
  detail: (id: Id) => [...logKeys.all, 'detail', String(id)] as const,
}
