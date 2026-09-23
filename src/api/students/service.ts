import { paginated, request } from '../client'
import type { Id } from '../types'
import type { Invoice } from '../invoices/types'
import type {
  PromoteStudentsBody,
  SetStudentStatusBody,
  Student,
  StudentBody,
  StudentListParams,
  StudentResult,
  StudentResultParams,
} from './types'

export const studentsService = {
  list: (params: StudentListParams = {}) =>
    request<Record<string, unknown>>('students', { query: { ...params } }).then((data) =>
      paginated<Student>(data, 'students'),
    ),

  /**
   * Everyone still sitting at `status: 'Applied'`. The envelope keys these
   * under `applicants`, not `students` — reading the wrong one gave back
   * undefined for every call.
   */
  applicants: (sessionId?: number) =>
    request<{ applicants: Student[] }>('students/applicants', {
      query: { session_id: sessionId },
    }).then((data) => data.applicants),

  get: (id: Id) => request<{ student: Student }>(`students/${id}`).then((data) => data.student),

  create: (body: StudentBody) =>
    request<{ student: Student }>('students', { method: 'POST', body }),

  update: (id: Id, body: StudentBody) =>
    request<{ student: Student }>(`students/${id}`, { method: 'POST', body }),

  setStatus: (id: Id, body: SetStudentStatusBody) =>
    request<{ student: Student }>(`students/${id}/status`, { method: 'POST', body }),

  promote: (body: PromoteStudentsBody) =>
    request<unknown>('students/promote', { method: 'POST', body }),

  invoices: (id: Id) =>
    request<{ invoices: Invoice[] }>(`students/${id}/invoices`).then((data) => data.invoices),

  /** Approved results only. */
  results: (id: Id, params: StudentResultParams = {}) =>
    request<{ results: StudentResult[] }>(`students/${id}/results`, {
      query: { ...params },
    }).then((data) => data.results),
}
