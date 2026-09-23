import { paginated, request } from '../client'
import type { Id } from '../types'
import type { Admin } from '../users/types'
import type {
  AdminActivity,
  AdminListParams,
  AdminPrivileges,
  CreateAdminBody,
  SetPrivilegesBody,
  UpdateAdminRecordBody,
} from './types'

export const adminsService = {
  list: (params: AdminListParams = {}) =>
    request<Record<string, unknown>>('admins', { query: { ...params } }).then((data) =>
      paginated<Admin>(data, 'admins'),
    ),

  /** The caller's own office record. */
  profile: () => request<{ admin: Admin }>('admins/profile').then((data) => data.admin),

  /**
   * One office record, whole: the privileges, the class and the login with its
   * role, country and state expanded — everything the record page shows, in
   * one call.
   *
   * It answers 404 "Admin not found." for any administrator whose login holds
   * `country_id`/`state_id` of 0, which on bronze is seven of the nine: the
   * query joins Countries and States, and there is no row 0 to join to. That
   * is a fault on the server, not a record that is missing, and the page says
   * so rather than inventing a record out of the list.
   */
  get: (id: Id) =>
    request<{ admin: Admin }>(`users/admins/${id}`).then((data) => data.admin),

  /** Creates the Users login and the Admins profile in one call. */
  create: (body: CreateAdminBody) =>
    request<{ admin: Admin }>('admins/new-admin', { method: 'POST', body }),

  update: (id: Id, body: UpdateAdminRecordBody) =>
    request<{ admin: Admin }>(`admins/${id}`, { method: 'POST', body }),

  /** Permanent. Never your own, and admin 1 is protected. */
  remove: (id: Id) => request<unknown>(`admins/${id}`, { method: 'DELETE' }),

  /**
   * What they hold, plus the full list to choose from. Unlike `get` this
   * answers for every administrator, so it doubles as the way to read one.
   */
  privileges: (id: Id) => request<AdminPrivileges>(`admins/${id}/privileges`),

  setPrivileges: (id: Id, body: SetPrivilegesBody) =>
    request<AdminPrivileges>(`admins/${id}/privileges`, { method: 'POST', body }),

  activityLogs: (id: Id, limit?: number) =>
    request<AdminActivity>(`admins/${id}/activity-logs`, { query: { limit } }),
}
