import type { Id } from '../types'

export const assignmentKeys = {
  all: ['assignments'] as const,
  list: (subjectId?: number) => [...assignmentKeys.all, 'list', subjectId] as const,
  detail: (setassignmentId: Id) =>
    [...assignmentKeys.all, 'detail', String(setassignmentId)] as const,
  result: (assignmentId: Id) => [...assignmentKeys.all, 'result', String(assignmentId)] as const,
  submissions: (setassignmentId: Id) =>
    [...assignmentKeys.detail(setassignmentId), 'submissions'] as const,
  submission: (assignmentId: Id) =>
    [...assignmentKeys.all, 'submission', String(assignmentId)] as const,
}
