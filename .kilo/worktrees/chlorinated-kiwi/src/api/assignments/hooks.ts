import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { setAssignmentKeys } from '../set-assignments/keys'
import type { Id } from '../types'
import { assignmentKeys } from './keys'
import { assignmentsService } from './service'
import type { SubmitAssignmentBody } from './types'

export function useAssignments(subjectId?: number) {
  return useQuery({
    queryKey: assignmentKeys.list(subjectId),
    queryFn: () => assignmentsService.list(subjectId),
  })
}

export function useAssignment(setassignmentId: Id | undefined) {
  return useQuery({
    queryKey: assignmentKeys.detail(setassignmentId ?? ''),
    queryFn: () => assignmentsService.get(setassignmentId!),
    enabled: setassignmentId !== undefined,
    // A sat assignment must not be served from cache on a re-entry.
    staleTime: 0,
  })
}

/**
 * Submitting closes the assignment, so both the list's `my_status` and the
 * assignment's own `my_submission` are stale the moment it answers.
 */
/**
 * Deliberately on the wire, not the queue — the decision, written down: the
 * sitting's window is judged by the school against its own clock, so an
 * answer sheet queued offline and sent hours later would land after the
 * window and be refused with the student long gone. The attempt itself is kept
 * on the device (`attempt.ts`), so a refused submit loses nothing typed; what
 * a student needs offline is to be told "this needs a connection" at the
 * moment of sending, which the page does.
 */
export function useSubmitAssignment(setassignmentId: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SubmitAssignmentBody) =>
      assignmentsService.submit(setassignmentId, body),
    meta: { success: 'Your answers were submitted' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all })
      // The teacher's submissions list is this same attempt, read through the
      // controller that set the assignment.
      queryClient.invalidateQueries({ queryKey: setAssignmentKeys.all })
    },
  })
}

/** Keyed on the submission id, off `my_submission.id`. See the service. */
export function useAssignmentResult(submissionId: Id | undefined) {
  return useQuery({
    queryKey: assignmentKeys.result(submissionId ?? ''),
    queryFn: () => assignmentsService.result(submissionId!),
    enabled: submissionId !== undefined,
  })
}

export function useAssignmentSubmissions(setassignmentId: Id | undefined) {
  return useQuery({
    queryKey: assignmentKeys.submissions(setassignmentId ?? ''),
    queryFn: () => assignmentsService.submissions(setassignmentId!),
    enabled: setassignmentId !== undefined,
  })
}

export function useAssignmentSubmission(submissionId: Id | undefined) {
  return useQuery({
    queryKey: assignmentKeys.submission(submissionId ?? ''),
    queryFn: () => assignmentsService.submission(submissionId!),
    enabled: submissionId !== undefined,
  })
}
