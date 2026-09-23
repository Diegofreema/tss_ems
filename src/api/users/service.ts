import { paginated, request, requestBlob, toFormData } from '../client'
import type { Id } from '../types'
import type {
  Admin,
  CreateUserBody,
  Role,
  SetUserStatusBody,
  UpdateAdminBody,
  UpdateProfileBody,
  User,
  StudentFeeStatus,
  UserListParams,
  UsersDashboard,
} from './types'

export const usersService = {
  /** Admin home: counters plus the revenue and transaction graphs. */
  dashboard: () => request<UsersDashboard>('users/dashboard'),

  /** Reference list that feeds every role dropdown. */
  roles: () => request<{ roles: Role[] }>('users/roles').then((data) => data.roles),

  list: (params: UserListParams = {}) =>
    request<Record<string, unknown>>('users', { query: { ...params } }).then((data) =>
      paginated<User>(data, 'users'),
    ),

  get: (id: Id) => request<{ user: User }>(`users/${id}`).then((data) => data.user),

  /** Permanent, and no undo. You cannot delete your own account. */
  remove: (id: Id) => request<unknown>(`users/${id}`, { method: 'DELETE' }),

  /** Whether the person can sign in at all. Never your own account. */
  setStatus: ({ id, status }: SetUserStatusBody) =>
    request<{ user: User }>(`users/status/${id}`, { method: 'POST', body: { status } }),

  /** Frees a login address — refused with 409 if a student still hangs off it. */
  freeEmail: (email: string) =>
    request<unknown>('users/check-email', { method: 'POST', body: { email } }),

  /** The caller's own admin record. */
  profile: () => request<{ admin: Admin }>('users/profile').then((data) => data.admin),

  updateProfile: (body: UpdateProfileBody) =>
    request<{ admin: Admin }>('users/profile', { method: 'PATCH', form: toFormData(body) }),

  listAdmins: () => request<{ admins: Admin[] }>('users/admins').then((data) => data.admins),

  getAdmin: (id: Id) =>
    request<{ admin: Admin }>(`users/admins/${id}`).then((data) => data.admin),

  updateAdmin: (id: Id, body: UpdateAdminBody) =>
    request<{ admin: Admin }>(`users/admins/${id}`, { method: 'POST', form: toFormData(body) }),

  /** Creates the login and the admin record together. */
  createAdmin: (body: CreateUserBody) =>
    request<{ user: User }>('users/new-admin', { method: 'POST', body }),

  /** What a student owes, for the fee status screen. */
  studentFees: (studentId: Id) => request<StudentFeeStatus>(`users/fees/${studentId}`),

  /** An applicant's uploaded file, by stored filename. */
  download: (filename: string) => requestBlob(`users/download/${filename}`),

  /** Sends a test message to the caller's own address. */
  testEmail: () => request<unknown>('users/test-email', { method: 'POST', body: {} }),
}
