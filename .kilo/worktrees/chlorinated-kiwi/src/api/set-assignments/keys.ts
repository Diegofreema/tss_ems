import type { Id } from '../types'
import type { AssignmentListParams } from './types'

export const setAssignmentKeys = {
  all: ['set-assignments'] as const,
  list: (params: AssignmentListParams) => [...setAssignmentKeys.all, 'list', params] as const,
  detail: (assignmentId: Id) => [...setAssignmentKeys.all, 'detail', String(assignmentId)] as const,
  questions: (assignmentId: Id) => [...setAssignmentKeys.detail(assignmentId), 'questions'] as const,
  submissions: (assignmentId: Id) => [...setAssignmentKeys.detail(assignmentId), 'submissions'] as const,
  /** Keyed on the submission, which no assignment id reaches it by. */
  submission: (submissionId: Id) =>
    [...setAssignmentKeys.all, 'submission', String(submissionId)] as const,
}
