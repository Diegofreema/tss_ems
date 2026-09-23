import { queryOptions } from '@tanstack/react-query'
import { assignmentKeys } from '@/api/assignments/keys'
import { assignmentsService } from '@/api/assignments/service'

/**
 * What is left on the query path in the student's portal.
 *
 * Everything a page *lists* is a set on the device now — see
 * `src/db/collections/schooling.ts`. These two are deliberately not: they are
 * the answers a sitting turns on, and a stale copy of either would put a student
 * into an assignment they cannot send back. See `attempt.ts`.
 */

/**
 * `GET /assignments/{id}` — one assignment and its questions.
 *
 * Never cached: this is the answer that says whether the assignment has been
 * submitted and whether its window is still open, and a stale copy of either
 * would put a student into an assignment they cannot send back.
 */
export const studentAssignmentQuery = (setassignmentId: string) =>
  queryOptions({
    queryKey: assignmentKeys.detail(setassignmentId),
    queryFn: () => assignmentsService.get(setassignmentId),
    staleTime: 0,
    // "Never cached" has to mean it: `staleTime: 0` only marks the entry
    // stale, and a route loader's `ensureQueryData` hands back whatever is in
    // the cache however stale — which offline is exactly the stale copy this
    // comment forbids. So the entry is dropped almost as soon as the page
    // lets go of it, and a revisit asks again or refuses honestly. Not zero:
    // the loader holds no observer, and a zero would collect the entry in the
    // moment between the loader answering and the page mounting.
    gcTime: 2_000,
    // `always`, so an offline device fails fast into the route's error
    // boundary instead of pausing the loader on a promise that never settles.
    networkMode: 'always',
  })

/** `GET /assignments/results/{id}` — keyed on the submission, not the assignment. */
export const studentAssignmentResultQuery = (submissionId: string) =>
  queryOptions({
    queryKey: assignmentKeys.result(submissionId),
    queryFn: () => assignmentsService.result(submissionId),
    networkMode: 'always',
  })
