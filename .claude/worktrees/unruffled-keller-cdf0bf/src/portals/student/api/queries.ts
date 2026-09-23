import { queryOptions } from '@tanstack/react-query'
import { assignmentKeys } from '@/api/assignments/keys'
import { assignmentsService } from '@/api/assignments/service'
import { registerKeys } from '@/api/attendance/keys'
import { registerService } from '@/api/attendance/service'
import { mySchoolingKeys } from '@/api/my-schooling/keys'
import { mySchoolingService } from '@/api/my-schooling/service'
import { resultKeys } from '@/api/results/keys'
import { resultsService } from '@/api/results/service'
import { timetableKeys } from '@/api/timetables/keys'
import { timetablesService } from '@/api/timetables/service'

/**
 * The two answers every pupil page is built out of. Kept together so the
 * dashboard, the sidebar and the fee register all read one cache entry each
 * rather than a copy of the same request per page.
 */

/** `GET /students/me` — the pupil's whole record, relations expanded. */
export const studentRecordQuery = queryOptions({
  queryKey: mySchoolingKeys.record(),
  queryFn: () => mySchoolingService.record(),
})

/** `GET /students/me/dashboard` — five counters and nothing else. */
export const studentStatsQuery = queryOptions({
  queryKey: mySchoolingKeys.dashboard(),
  queryFn: () => mySchoolingService.dashboard(),
})

/**
 * `GET /results/mine` — released marks only, every term at once, with the
 * term average beside them. No parameters: a pupil cannot name a session or a
 * term to ask for one, since `/sessions` and `/semesters` are shut to them.
 *
 * Not `students/me/results`, which answered `{results: []}` for every pupil
 * ever probed. This is the results controller's own pupil route.
 */
export const studentResultsQuery = queryOptions({
  queryKey: resultKeys.mine({}),
  queryFn: () => resultsService.mine(),
})

/**
 * `GET /attendances/mine` — every day somebody took a register on this pupil.
 *
 * No parameters: the range is the whole record, because a pupil has no term to
 * narrow it by. The percentage on it is the school's own, counted over days
 * marked rather than over the length of term.
 */
export const studentAttendanceQuery = queryOptions({
  queryKey: registerKeys.mine({}),
  queryFn: () => registerService.mine(),
})

/** `GET /students/me/invoices` — settled bills only, whatever it is asked. */
export const studentInvoicesQuery = queryOptions({
  queryKey: mySchoolingKeys.invoices(),
  queryFn: () => mySchoolingService.invoices(),
})

/**
 * `GET /students/me/materials` — the files shared with the pupil's class.
 *
 * Answers `{ "materials": [] }` for every pupil: the table it reads is empty
 * across the whole school, and no endpoint on this API fills it.
 */
export const studentMaterialsQuery = queryOptions({
  queryKey: mySchoolingKeys.materials(),
  queryFn: () => mySchoolingService.materials(),
})

/**
 * `GET /students/me/courses` — the subjects the pupil is registered for.
 *
 * The whole answer, not the list alone: the class, the session and the term
 * the registration was made against arrive beside it, and the record a row
 * opens reads them from here.
 */
export const studentCoursesQuery = queryOptions({
  queryKey: mySchoolingKeys.courses(),
  queryFn: () => mySchoolingService.courses(),
})

/**
 * `GET /timetables/mine` — the pupil's own class grid for the current term.
 *
 * Asked without a term: both `session_id` and `semester_id` are optional and
 * only matter together, and a pupil has no way to name a past term to ask for
 * one. The whole answer is kept — the class, the session and the term it was
 * drawn for are siblings of `days`, not fields on a period.
 */
export const studentTimetableQuery = queryOptions({
  queryKey: timetableKeys.mine({}),
  queryFn: () => timetablesService.mine(),
})

/**
 * `GET /assignments` — every assignment set for the pupil's own class.
 *
 * Asked without a `subject_id`, which the endpoint treats as "all of them".
 * Sharing the key with `useAssignments()` so the register and anything else
 * reading the list collapse into one request.
 *
 * Not cached for long: `my_status` and `window_problem` are worked out by the
 * server against its own clock, so an assignment that opened a minute ago is only
 * open once this has been asked again.
 */
export const studentAssignmentsQuery = queryOptions({
  queryKey: assignmentKeys.list(undefined),
  queryFn: () => assignmentsService.list(),
  staleTime: 30_000,
})

/**
 * `GET /assignments/{id}` — one assignment and its questions.
 *
 * Never cached: this is the answer that says whether the assignment has been
 * submitted and whether its window is still open, and a stale copy of either
 * would put a pupil into an assignment they cannot send back.
 */
export const studentAssignmentQuery = (setassignmentId: string) =>
  queryOptions({
    queryKey: assignmentKeys.detail(setassignmentId),
    queryFn: () => assignmentsService.get(setassignmentId),
    staleTime: 0,
  })

/** `GET /assignments/results/{id}` — keyed on the submission, not the assignment. */
export const studentAssignmentResultQuery = (submissionId: string) =>
  queryOptions({
    queryKey: assignmentKeys.result(submissionId),
    queryFn: () => assignmentsService.result(submissionId),
  })
