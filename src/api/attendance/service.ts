import { request, requestBlob } from '../client'
import type { Id } from '../types'
import type {
  AttendanceClassArm,
  AttendanceDashboard,
  AttendanceDepartment,
  AttendanceExportParams,
  AttendanceReport,
  AttendanceReportParams,
  Coverage,
  CoverageParams,
  MyAttendance,
  MyAttendanceParams,
  MyClass,
  Register,
  RegisterParams,
  StatusCatalogue,
  SavedRegister,
  TakeRegisterBody,
} from './types'

export const attendanceService = {
  /** Optional `date` is YYYY-MM-DD; absent means today. */
  dashboard: (date?: string) =>
    request<AttendanceDashboard>('admin-attendances', { query: { date } }),

  /**
   * The whole payload, not just the page. `stats` counts the range rather than
   * the page, and `filters` says which dates the endpoint actually used where
   * none were given — both are on screen, so neither can be thrown away here.
   */
  report: (params: AttendanceReportParams = {}) =>
    request<AttendanceReport>('admin-attendances/report', { query: { ...params } }),

  /** Same filters as the report, arm included, handed back as a CSV file. */
  exportCsv: (params: AttendanceExportParams = {}) =>
    requestBlob('admin-attendances/export', { query: { ...params } }),

  departments: () =>
    request<{ departments: AttendanceDepartment[] }>('admin-attendances/departments').then(
      (data) => data.departments,
    ),

  /** Active arms only, optionally narrowed to one department. */
  classArms: (departmentId?: number) =>
    request<{ class_arms: AttendanceClassArm[] }>('admin-attendances/class-arms', {
      query: { department_id: departmentId },
    }).then((data) => data.class_arms),
}

/**
 * The daily register: what a class teacher takes, and what a student or a
 * guardian reads off it.
 *
 * The class teacher of an arm takes its register, not every teacher who
 * teaches the class — a subject teacher gets a 403.
 */
export const registerService = {
  /** 404 for a teacher who is nobody's class teacher. */
  myClasses: () =>
    request<{ classes: MyClass[] }>('attendances/my-classes').then((data) => data.classes),

  /** The school's own words for a mark, and which of them count as in school. */
  statuses: () => request<StatusCatalogue>('attendances/statuses'),

  /** One arm, one day; today where no date is given. */
  register: (params: RegisterParams) =>
    request<Register>('attendances/register', { query: { ...params } }),

  /**
   * The saved register comes back on the response, so nothing needs re-reading
   * to show what was written.
   */
  take: (body: TakeRegisterBody) =>
    request<SavedRegister>('attendances/register', { method: 'POST', body }),

  coverage: (params: CoverageParams) =>
    request<Coverage>('attendances/coverage', { query: { ...params } }),

  /** The signed-in student's own record. */
  mine: (params: MyAttendanceParams = {}) =>
    request<MyAttendance>('attendances/mine', { query: { ...params } }),

  /**
   * A guardian's children with their figures. Unused: the parent portal reads
   * `sparents/my-children/{id}/attendance`, whose shape is verified and whose
   * stats are the server's. Here because the service mirrors the controller.
   */
  children: () => request<MyAttendance>('attendances/children'),

  /**
   * Whose student this is decides the answer, not the id in the URL — a class
   * teacher may read their own arm's students, a guardian only their children,
   * a student only themselves. Unused for the same reason as `children`.
   */
  forStudent: (studentId: Id, params: MyAttendanceParams = {}) =>
    request<MyAttendance>(`attendances/student/${studentId}`, { query: { ...params } }),
}
