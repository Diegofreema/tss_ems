import { request } from '../client'
import type {
  MyCourses,
  MyInvoices,
  MyMaterial,
  Student,
  StudentDashboard,
  UpdateMyRecordBody,
} from './types'

/** Everything under `/students/me` — the pupil is resolved from the token. */
export const mySchoolingService = {
  record: () => request<{ student: Student }>('students/me').then((data) => data.student),

  updateRecord: (body: UpdateMyRecordBody) =>
    request<{ student: Student }>('students/me', { method: 'POST', body }),

  dashboard: () => request<StudentDashboard>('students/me/dashboard'),

  /**
   * Subjects the caller is registered for, with the class, session and term
   * the registration was made against. The whole answer is kept: the class is
   * a sibling of the list, not a field on a course.
   */
  courses: () => request<MyCourses>('students/me/courses'),

  /** The bills and the payments taken against them, in one answer. */
  invoices: () => request<MyInvoices>('students/me/invoices'),

  /** Files shared with the caller's class. Empty school-wide — see `MyMaterial`. */
  materials: () =>
    request<{ materials: MyMaterial[] }>('students/me/materials').then(
      (data) => data.materials ?? [],
    ),
}
