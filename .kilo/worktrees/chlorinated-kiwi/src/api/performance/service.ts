import { request } from '../client'
import type { Id } from '../types'
import type {
  AtRisk,
  AtRiskParams,
  AttendanceVsMarks,
  AttendanceVsMarksParams,
  ClassPerformance,
  ClassPerformanceParams,
  Movers,
  MoversParams,
  QuestionAnalysis,
  StudentPerformance,
  StudentPerformanceParams,
} from './types'

/**
 * Six reads, no writes — this family only ever counts what other endpoints
 * wrote. Every one of them answers for a whole class or a whole student rather
 * than for a page of rows, so none paginates and none takes a search.
 *
 * Each answer is handed on whole, `message` and all: the sentence explaining
 * an empty answer is the most useful thing on most of these responses today,
 * and narrowing to the arrays would throw it away.
 */
export const performanceService = {
  /** One student: terms, subjects against their own average, and attendance. */
  student: (id: Id, params: StudentPerformanceParams = {}) =>
    request<StudentPerformance>(`performance/student/${id}`, { query: { ...params } }),

  /** One class, per subject. Staff only — see `ClassPerformance`. */
  class: (params: ClassPerformanceParams) =>
    request<ClassPerformance>('performance/class', { query: { ...params } }),

  /** Who changed between two named terms. Both ends are required. */
  movers: (params: MoversParams) =>
    request<Movers>('performance/movers', { query: { ...params } }),

  /** Attendance beside marks, with a correlation only where one is honest. */
  attendanceVsMarks: (params: AttendanceVsMarksParams) =>
    request<AttendanceVsMarks>('performance/attendance-vs-marks', { query: { ...params } }),

  /** Rule-based, fully stated, and a prompt rather than a decision. */
  atRisk: (params: AtRiskParams) =>
    request<AtRisk>('performance/at-risk', { query: { ...params } }),

  /**
   * Which questions a class got wrong. A paper nobody has set is a 404
   * carrying "That paper could not be found."
   */
  questions: (paperId: Id) => request<QuestionAnalysis>(`performance/questions/${paperId}`),
}
