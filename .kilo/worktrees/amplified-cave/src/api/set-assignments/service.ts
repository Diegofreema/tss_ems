import { paginated, request } from '../client.ts'
import type { Id, Paginated } from '../types.ts'
import type {
  GradeBody,
  MarkedSubmission,
  Assignment,
  AssignmentBody,
  AssignmentListParams,
  AssignmentQuestion,
  AssignmentQuestions,
  AssignmentSubmissions,
  QuestionBody,
} from './types.ts'

/**
 * `/setassignments` — the teaching side of the CBT, where an assignment is written.
 * `/assignments` beside it is the student's, where the same assignment is sat.
 *
 * Every write is a POST, which is this API's habit for an update as much as
 * for a create — `/subjects/{id}` and `/teachers/me/topics/{id}` both take one.
 * Not verified against the server: the controller is not deployed on the
 * environment this portal is proxied to, so the shapes here are the school's
 * own documented ones and nothing more.
 */
export const setAssignmentsService = {
  /** Only the caller's own assignments, whatever is asked for. */
  list: (params: AssignmentListParams = {}): Promise<Paginated<Assignment>> =>
    request<Record<string, unknown>>('setassignments', { query: { ...params } }).then(
      // `papers` is the school's own key for the list, not this portal's word
      // for what is in it. Every wire name below is likewise the server's.
      (data) => paginated<Assignment>(data, 'papers'),
    ),

  /** The assignment with its questions, so a page that has both needs one call. */
  get: (assignmentId: Id) =>
    request<{ paper: Assignment; questions?: AssignmentQuestion[] | null }>(
      `setassignments/${assignmentId}`,
    ),

  create: (body: AssignmentBody) =>
    request<{ paper: Assignment }>('setassignments', { method: 'POST', body }),

  update: (assignmentId: Id, body: AssignmentBody) =>
    request<{ paper: Assignment }>(`setassignments/${assignmentId}`, {
      method: 'POST',
      body,
    }),

  remove: (assignmentId: Id) =>
    request<unknown>(`setassignments/${assignmentId}`, { method: 'DELETE' }),

  /** The questions alone, with the assignment's total marks worked out beside them. */
  questions: (assignmentId: Id) =>
    request<AssignmentQuestions>(`setassignments/${assignmentId}/questions`),

  addQuestion: (assignmentId: Id, body: QuestionBody) =>
    request<{ question: AssignmentQuestion }>(`setassignments/${assignmentId}/questions`, {
      method: 'POST',
      body,
    }),

  /** The options are replaced wholesale, as they are sent. */
  updateQuestion: (assignmentId: Id, questionId: Id, body: QuestionBody) =>
    request<{ question: AssignmentQuestion }>(
      `setassignments/${assignmentId}/questions/${questionId}`,
      { method: 'POST', body },
    ),

  removeQuestion: (assignmentId: Id, questionId: Id) =>
    request<unknown>(`setassignments/${assignmentId}/questions/${questionId}`, {
      method: 'DELETE',
    }),

  /** Who sat the assignment, with the school's own sat / marked / waiting beside them. */
  submissions: (assignmentId: Id) =>
    request<AssignmentSubmissions>(`setassignments/${assignmentId}/submissions`),

  /** One attempt, keyed on the submission — the assignment's id does not reach it. */
  submission: (submissionId: Id) =>
    request<MarkedSubmission>(`setassignments/submissions/${submissionId}`),

  grade: (submissionId: Id, body: GradeBody) =>
    request<unknown>(`setassignments/submissions/${submissionId}/grade`, {
      method: 'POST',
      body,
    }),
}
