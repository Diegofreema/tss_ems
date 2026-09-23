import type { Id } from '../types'
import type { AdminListParams } from './types'

export const adminKeys = {
  all: ['admins'] as const,
  lists: () => [...adminKeys.all, 'list'] as const,
  list: (params: AdminListParams) => [...adminKeys.lists(), params] as const,
  profile: () => [...adminKeys.all, 'profile'] as const,
  details: () => [...adminKeys.all, 'detail'] as const,
  detail: (id: Id) => [...adminKeys.details(), String(id)] as const,
  privileges: (id: Id) => [...adminKeys.detail(id), 'privileges'] as const,
  activity: (id: Id, limit?: number) => [...adminKeys.detail(id), 'activity', limit] as const,
}
