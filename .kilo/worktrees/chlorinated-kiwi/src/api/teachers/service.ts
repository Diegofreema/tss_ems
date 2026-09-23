import { paginated, request, requestBlob } from '../client'
import type { Id } from '../types'
import type {
  AssignSubjectsBody,
  CreateStaffBody,
  MailStaffBody,
  StaffListParams,
  Teacher,
  UpdateStaffBody,
} from './types'

export const teachersService = {
  list: (params: StaffListParams = {}) =>
    request<Record<string, unknown>>('teachers', { query: { ...params } }).then((data) =>
      paginated<Teacher>(data, 'teachers'),
    ),

  get: (id: Id) => request<{ teacher: Teacher }>(`teachers/${id}`).then((data) => data.teacher),

  /** Creates the Users login and the Teachers record in one call. */
  create: (body: CreateStaffBody) =>
    request<{ teacher: Teacher }>('teachers', { method: 'POST', body }),

  update: (id: Id, body: UpdateStaffBody) =>
    request<{ teacher: Teacher }>(`teachers/${id}`, { method: 'POST', body }),

  /** Permanent — there is no undo. */
  remove: (id: Id) => request<unknown>(`teachers/${id}`, { method: 'DELETE' }),

  assignSubjects: (id: Id, body: AssignSubjectsBody) =>
    request<unknown>(`teachers/${id}/subjects`, { method: 'POST', body }),

  /**
   * The CV as a file. 404 "No CV has been uploaded for this member of staff."
   * where there is none, which is every teaching record on the school's server
   * today — so what a success actually answers with has not been seen, and the
   * caller reads a file body or an envelope naming one.
   */
  cv: (id: Id) => requestBlob(`teachers/${id}/cv`),

  /**
   * One message to many logins — `user_ids` are the logins behind the teaching
   * records, not the teacher ids. Path confirmed by the school; it cannot be
   * probed, since bronze answers a GET the same way for a route it does not
   * have and for a POST-only route it does.
   */
  mail: (body: MailStaffBody) => request<unknown>('teachers/mail', { method: 'POST', body }),
}
