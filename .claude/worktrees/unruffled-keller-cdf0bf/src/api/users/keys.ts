import type { Id } from '../types'
import type { UserListParams } from './types'

/**
 * Cache addresses for this domain. Kept apart from the hooks so another
 * domain can invalidate these — paying an invoice touches a user's fee
 * status — without importing React.
 */
export const userKeys = {
  all: ['users'] as const,
  dashboard: () => [...userKeys.all, 'dashboard'] as const,
  roles: () => [...userKeys.all, 'roles'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: Id) => [...userKeys.details(), String(id)] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
  admins: () => [...userKeys.all, 'admins'] as const,
  admin: (id: Id) => [...userKeys.admins(), String(id)] as const,
  studentFees: (studentId: Id) => [...userKeys.all, 'fees', String(studentId)] as const,
}
