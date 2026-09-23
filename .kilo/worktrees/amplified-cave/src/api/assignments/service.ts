import { request } from '../client'
import type { Id } from '../types'
import type {
  Assignment,
  AssignmentDetail,
  AssignmentResult,
  SubmitAssignmentBody,
  Submission,
} from './types'

export const assignmentsService = {
  /**
   * Every assignment set for the caller's own class, newest last.
   *
   * `subject_id` narrows it and is optional — without one the whole list comes
   * back, which is what the student's own list wants. An assignment set for another
   * class never appears whatever is asked for.
   *
   * Students only: an office or teaching login is refused with "No student
   * record is linked to this account."
   */
  list: (subjectId?: number) =>
    request<{ assignments: Assignment[] }>('assignments', {
      query: { subject_id: subjectId },
    }).then((data) => {
      // A missing field is a shape change, not an empty term. This list is
      // the complete state of a set on the device, so reading it as "no
      // assignments" would erase the device's copy and look like none set.
      if (!Array.isArray(data.assignments)) {
        throw new Error('The server sent the assignment list in a shape this app cannot read.')
      }
      return data.assignments
    }),

  /** An assignment set for another class is refused; one that never existed 404s. */
  get: (setassignmentId: Id) =>
    request<AssignmentDetail>(`assignments/${setassignmentId}`),

  /**
   * Re-submitting a finished assignment is a 409, and an assignment outside its window
   * is refused with the reason.
   */
  submit: (setassignmentId: Id, body: SubmitAssignmentBody) =>
    request<unknown>(`assignments/${setassignmentId}/submit`, { method: 'POST', body }),

  /**
   * The caller's own marked attempt.
   *
   * Keyed on the **submission** id — `my_submission.id` off the assignment — not on
   * the assignment's. The assignment's own id answers "That result could not be found."
   */
  result: (submissionId: Id) =>
    request<AssignmentResult>(`assignments/results/${submissionId}`),

  /** For the teacher who set the assignment, or an admin. 403 for anyone else. */
  submissions: (setassignmentId: Id) =>
    request<{ submissions: Submission[] }>(
      `assignments/${setassignmentId}/submissions`,
    ).then((data) => data.submissions),

  /** One submission with the marking fields attached. */
  submission: (submissionId: Id) =>
    request<Submission>(`assignments/submissions/${submissionId}`),
}
