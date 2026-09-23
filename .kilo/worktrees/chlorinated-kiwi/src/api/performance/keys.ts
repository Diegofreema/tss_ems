import type { Id } from '../types'
import type {
  AtRiskParams,
  AttendanceVsMarksParams,
  ClassPerformanceParams,
  MoversParams,
  StudentPerformanceParams,
} from './types'

/**
 * One root, because everything under it is derived from the same two things —
 * the marks and the register — and a mark being approved changes every one of
 * these answers at once.
 */
export const performanceKeys = {
  all: ['performance'] as const,
  student: (id: Id | undefined, params: StudentPerformanceParams) =>
    [...performanceKeys.all, 'student', String(id ?? ''), params] as const,
  class: (params: Partial<ClassPerformanceParams>) =>
    [...performanceKeys.all, 'class', params] as const,
  movers: (params: Partial<MoversParams>) => [...performanceKeys.all, 'movers', params] as const,
  attendanceVsMarks: (params: Partial<AttendanceVsMarksParams>) =>
    [...performanceKeys.all, 'attendance-vs-marks', params] as const,
  atRisk: (params: Partial<AtRiskParams>) => [...performanceKeys.all, 'at-risk', params] as const,
  questions: (paperId: Id | undefined) =>
    [...performanceKeys.all, 'questions', String(paperId ?? '')] as const,
}
