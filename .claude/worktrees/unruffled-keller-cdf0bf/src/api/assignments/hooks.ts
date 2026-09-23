import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
export function useSubmitAssignment(setassignmentId: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SubmitAssignmentBody) =>
      assignmentsService.submit(setassignmentId, body),
    meta: { success: 'Your answers were submitted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
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
