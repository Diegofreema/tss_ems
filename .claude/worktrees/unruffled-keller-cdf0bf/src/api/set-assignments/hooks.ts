import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id } from '../types'
import { setAssignmentKeys } from './keys'
import { setAssignmentsService } from './service'
import type { GradeBody, QuestionBody } from './types'

/** The assignment being written, with the questions it already holds. */
export function useSetAssignment(assignmentId: Id | undefined) {
  return useQuery({
    queryKey: setAssignmentKeys.detail(assignmentId ?? ''),
    queryFn: () => setAssignmentsService.get(assignmentId!),
    enabled: assignmentId !== undefined && assignmentId !== '',
  })
}

/**
 * The questions alone. Asked separately from the assignment because this is the
 * one that carries the total marks, and because writing a question changes
 * only this side of the record.
 */
export function useSetAssignmentQuestions(assignmentId: Id | undefined) {
  return useQuery({
    queryKey: setAssignmentKeys.questions(assignmentId ?? ''),
    queryFn: () => setAssignmentsService.questions(assignmentId!),
    enabled: assignmentId !== undefined && assignmentId !== '',
  })
}

/**
 * Writing a question moves the assignment's own `total_questions` as well as the
 * question list, so both go — and so does the list, which shows the count.
 */
function useQuestionWrite(success: string) {
  const queryClient = useQueryClient()
  return {
    meta: { success },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: setAssignmentKeys.all })
    },
  }
}

export function useAddQuestion(assignmentId: Id) {
  const shared = useQuestionWrite('Question added')
  return useMutation({
    mutationFn: (body: QuestionBody) => setAssignmentsService.addQuestion(assignmentId, body),
    ...shared,
  })
}

export function useUpdateQuestion(assignmentId: Id) {
  const shared = useQuestionWrite('Question saved')
  return useMutation({
    mutationFn: ({ questionId, body }: { questionId: Id; body: QuestionBody }) =>
      setAssignmentsService.updateQuestion(assignmentId, questionId, body),
    ...shared,
  })
}

export function useRemoveQuestion(assignmentId: Id) {
  const shared = useQuestionWrite('Question deleted')
  return useMutation({
    mutationFn: (questionId: Id) =>
      setAssignmentsService.removeQuestion(assignmentId, questionId),
    ...shared,
  })
}

/** Who sat one assignment. Never cached long: a pupil may be sitting it right now. */
export function useSetAssignmentSubmissions(assignmentId: Id | undefined) {
  return useQuery({
    queryKey: setAssignmentKeys.submissions(assignmentId ?? ''),
    queryFn: () => setAssignmentsService.submissions(assignmentId!),
    enabled: assignmentId !== undefined && assignmentId !== '',
    staleTime: 30_000,
  })
}

/** One attempt with its answers, as the marking sheet reads it. */
export function useSubmission(submissionId: Id | undefined) {
  return useQuery({
    queryKey: setAssignmentKeys.submission(submissionId ?? ''),
    queryFn: () => setAssignmentsService.submission(submissionId!),
    enabled: submissionId !== undefined && submissionId !== '',
  })
}

/**
 * Marking moves the attempt, the assignment's waiting count and the list's own
 * figures at once, so the whole of this controller's cache is dropped rather
 * than the one entry that was written.
 */
export function useGradeSubmission(submissionId: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: GradeBody) => setAssignmentsService.grade(submissionId, body),
    meta: { success: 'Marks saved' },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: setAssignmentKeys.all })
    },
  })
}
