import type { Id } from '../types'
import type {
  AttendanceReportParams,
  CoverageParams,
  MyAttendanceParams,
  RegisterParams,
} from './types'

export const attendanceKeys = {
  all: ['attendance'] as const,
  dashboard: (date?: string) => [...attendanceKeys.all, 'dashboard', date] as const,
  report: (params: AttendanceReportParams) => [...attendanceKeys.all, 'report', params] as const,
  departments: () => [...attendanceKeys.all, 'departments'] as const,
  classArms: (departmentId?: number) =>
    [...attendanceKeys.all, 'class-arms', departmentId] as const,
}

/** The daily register, under the same root so one save staleness the lot. */
export const registerKeys = {
  all: [...attendanceKeys.all, 'register'] as const,
  myClasses: () => [...registerKeys.all, 'my-classes'] as const,
  statuses: () => [...registerKeys.all, 'statuses'] as const,
  day: (params: RegisterParams) => [...registerKeys.all, 'day', params] as const,
  coverage: (params: CoverageParams) => [...registerKeys.all, 'coverage', params] as const,
  mine: (params: MyAttendanceParams) => [...registerKeys.all, 'mine', params] as const,
  children: () => [...registerKeys.all, 'children'] as const,
  student: (id: Id, params: MyAttendanceParams) =>
    [...registerKeys.all, 'student', String(id), params] as const,
}
