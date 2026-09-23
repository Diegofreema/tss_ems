import { setAssignmentsService } from '@/api/set-assignments/service'
import type { AssignmentBody, GradeBody, QuestionBody } from '@/api/set-assignments/types'
import type { Id } from '@/api/types'
import { SET, WRITE } from '../ids'
import { idOfAnswer } from '../new-id'
import { registerHandler } from '../registry'

/**
 * The teaching side of the CBT: the assignment, its questions, and the marks
 * given to what came back.
 */

/**
 * Setting an assignment. **Not** idempotent — the school issues the id, so a
 * replay of one that may already have been received is the same paper set
 * twice. An op interrupted in flight goes to the drawer for a person to
 * decide. Unwrapped to the paper itself so the drain can read the id the
 * school issued.
 */
registerHandler<AssignmentBody>(WRITE.createAssignment, {
  send: (body) => setAssignmentsService.create(body).then((answer) => answer.paper),
  idempotent: false,
  newId: idOfAnswer,
  collectionId: SET.teachingAssignments,
})

/** Editing one. Idempotent — the same fields over the same paper. */
registerHandler<{ id: Id; body: AssignmentBody }>(WRITE.updateAssignment, {
  send: ({ id, body }) => setAssignmentsService.update(id, body),
  idempotent: true,
  collectionId: SET.teachingAssignments,
})

/** Deleting one, questions and all. Idempotent: gone twice is gone. */
registerHandler<Id>(WRITE.removeAssignment, {
  send: (id) => setAssignmentsService.remove(id),
  idempotent: true,
  collectionId: SET.teachingAssignments,
})

/**
 * Writing a question. **Not** idempotent — the school issues the question's
 * id, so a replay files the question twice and the assignment is worth double
 * what was written.
 */
registerHandler<{ assignment_id: Id; body: QuestionBody }>(WRITE.addQuestion, {
  send: ({ assignment_id, body }) =>
    setAssignmentsService.addQuestion(assignment_id, body).then((answer) => answer.question),
  idempotent: false,
  // `idOfAnswer`, not `idUnder('question')`: `send` above has already taken the
  // question out of its envelope, so the reader was looking for a `question`
  // inside the question and finding nothing — the exact failure `new-id.ts`
  // was written to stop, and silent because no write yet depends on a
  // question's id. Same shape as `createAssignment`, which unwraps `{paper}`.
  newId: idOfAnswer,
  collectionId: SET.teachingQuestions,
})

/** Rewriting one. Idempotent — the options are replaced wholesale as sent. */
registerHandler<{ assignment_id: Id; question_id: Id; body: QuestionBody }>(
  WRITE.updateQuestion,
  {
    send: ({ assignment_id, question_id, body }) =>
      setAssignmentsService.updateQuestion(assignment_id, question_id, body),
    idempotent: true,
    collectionId: SET.teachingQuestions,
  },
)

/** Deleting one. Idempotent: gone twice is gone. */
registerHandler<{ assignment_id: Id; question_id: Id }>(WRITE.removeQuestion, {
  send: ({ assignment_id, question_id }) =>
    setAssignmentsService.removeQuestion(assignment_id, question_id),
  idempotent: true,
  collectionId: SET.teachingQuestions,
})

/**
 * The marks for one script. Idempotent — `scores` is keyed on `answer_id` and
 * a resend writes the same marks over the same answers; the school scores
 * nothing itself, so there is nothing of the school's to overwrite.
 */
registerHandler<{ submission_id: Id; body: GradeBody }>(WRITE.gradeSubmission, {
  send: ({ submission_id, body }) => setAssignmentsService.grade(submission_id, body),
  idempotent: true,
  collectionId: SET.teachingScripts,
})
