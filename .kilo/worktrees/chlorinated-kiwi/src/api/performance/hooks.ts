import { useQuery } from '@tanstack/react-query'
import type { Id } from '../types'
import { performanceKeys } from './keys'
import { performanceService } from './service'
import type {
  AtRiskParams,
  AttendanceVsMarksParams,
  ClassPerformanceParams,
  MoversParams,
  StudentPerformanceParams,
} from './types'

/**
 * **These stay on the query path, and that is the design rather than a
 * temporary exception** — CLAUDE.md asks a plain `useQuery` to justify itself,
 * and this is the justification.
 *
 * Every one of these is a server aggregate over the whole of the marks and
 * the register, in the same family as the analytics and the invoice ledger
 * scan already listed under "What is deliberately not local-first". A
 * collection holds a set of rows the device can be the authority on; a
 * Pearson correlation over a class, a grade distribution and a list of who
 * moved between two terms are none of those — the device holds no approved
 * marks to recompute them from, and a stale copy of "who is at risk" is worse
 * than an honest empty screen, because somebody would act on it.
 *
 * So each of these must **say plainly when it could not be reached** rather
 * than drawing zeroes. These endpoints make that easy: their own `message`
 * field is a sentence explaining an empty answer, and a screen shows that,
 * the error, or the figures — never a blank chart.
 */

/**
 * One student. Idle until an id is known, so a drawer that has not been opened
 * asks nothing.
 */
export function useStudentPerformance(
  id: Id | undefined,
  params: StudentPerformanceParams = {},
) {
  return useQuery({
    queryKey: performanceKeys.student(id, params),
    queryFn: () => performanceService.student(id!, params),
    enabled: id !== undefined,
  })
}

/** Idle until a class is chosen — `department_id` is required. */
export function useClassPerformance(params: Partial<ClassPerformanceParams>) {
  return useQuery({
    queryKey: performanceKeys.class(params),
    queryFn: () => performanceService.class(params as ClassPerformanceParams),
    enabled: params.department_id !== undefined,
  })
}

/**
 * Idle until the class and **both** terms are named. The endpoint answers 200
 * with an explanatory `message` when they are not, which is a fine thing for
 * a server to do and a poor thing to spend a request on.
 */
export function useMovers(params: Partial<MoversParams>) {
  const ready =
    params.department_id !== undefined &&
    params.from_semester_id !== undefined &&
    params.to_semester_id !== undefined
  return useQuery({
    queryKey: performanceKeys.movers(params),
    queryFn: () => performanceService.movers(params as MoversParams),
    enabled: ready,
  })
}

/** Idle until a class is chosen. The date range is optional. */
export function useAttendanceVsMarks(params: Partial<AttendanceVsMarksParams>) {
  return useQuery({
    queryKey: performanceKeys.attendanceVsMarks(params),
    queryFn: () => performanceService.attendanceVsMarks(params as AttendanceVsMarksParams),
    enabled: params.department_id !== undefined,
  })
}

/** Idle until a class is chosen. Show `thresholds` and `note` beside the list. */
export function useAtRisk(params: Partial<AtRiskParams>) {
  return useQuery({
    queryKey: performanceKeys.atRisk(params),
    queryFn: () => performanceService.atRisk(params as AtRiskParams),
    enabled: params.department_id !== undefined,
  })
}

/**
 * Which questions a class got wrong. A teaching signal — it belongs beside a
 * paper, on the teacher's own screen, and never beside a student's name.
 */
export function useQuestionAnalysis(paperId: Id | undefined) {
  return useQuery({
    queryKey: performanceKeys.questions(paperId),
    queryFn: () => performanceService.questions(paperId!),
    enabled: paperId !== undefined,
  })
}
