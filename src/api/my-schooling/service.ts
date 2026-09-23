import { request } from '../client'
import type {
  MyCourses,
  MyInvoices,
  MyMaterial,
  Student,
  StudentContent,
  StudentDashboard,
  UpdateMyRecordBody,
} from './types'

/** Everything under `/students/me` — the student is resolved from the token. */
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

  /**
   * What teachers have written up for the subjects this student takes.
   *
   * Asked for whole — the endpoint takes a `subject_id` and this does not pass
   * one. See `StudentContent`: one answer narrowed on the device beats one
   * request per subject opened, and it is the only version of this that works
   * with no connection.
   */
  content: () => request<StudentContent>('students/me/content'),

  /** The bills and the payments taken against them, in one answer. */
  invoices: () => request<MyInvoices>('students/me/invoices'),

  /** Files shared with the caller's class. Empty school-wide — see `MyMaterial`. */
  materials: () =>
    request<{ materials: MyMaterial[] }>('students/me/materials').then((data) => {
      // A missing field is a shape change, not an empty shelf — this list is
      // the complete state of a set on the device.
      if (!Array.isArray(data.materials)) {
        throw new Error('The server sent the materials in a shape this app cannot read.')
      }
      return data.materials
    }),
}
