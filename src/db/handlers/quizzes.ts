import { quizzesService } from '@/api/quizzes/service'
import type { PublishBody, QuizBody, QuizQuestionBody } from '@/api/quizzes/types'
import type { Id } from '@/api/types'
import { SET, WRITE } from '../ids'
import { idOfAnswer } from '../new-id'
import { registerHandler } from '../registry'

/**
 * Quizzes: setting one, writing its questions, and opening it to the class.
 * The same shape as `set-assignments.ts`, which quizzes were split from.
 */

/**
 * Setting a quiz. **Not** idempotent — the school issues the id, so a replay
 * of one that may already have landed is the same quiz twice. Unwrapped to the
 * quiz itself, so the drain reads the id the school issued.
 */
registerHandler<QuizBody>(WRITE.createQuiz, {
  send: (body) => quizzesService.create(body).then((answer) => answer.quiz),
  idempotent: false,
  newId: idOfAnswer,
  collectionId: SET.teachingQuizzes,
})

/** Editing one. Idempotent — the same fields over the same quiz. */
registerHandler<{ id: Id; body: QuizBody }>(WRITE.updateQuiz, {
  send: ({ id, body }) => quizzesService.update(id, body),
  idempotent: true,
  collectionId: SET.teachingQuizzes,
})

/** Deleting one. Idempotent: gone twice is gone. The school refuses one somebody has sat. */
registerHandler<Id>(WRITE.removeQuiz, {
  send: (id) => quizzesService.remove(id),
  idempotent: true,
  collectionId: SET.teachingQuizzes,
})

/**
 * Opening it to the class, or closing it again. Idempotent — the same status
 * twice is that status; reopening updates the class's notice rather than
 * adding a second.
 */
registerHandler<{ id: Id; body: PublishBody }>(WRITE.publishQuiz, {
  send: ({ id, body }) => quizzesService.publish(id, body),
  idempotent: true,
  collectionId: SET.teachingQuizzes,
})

/** Writing a question. **Not** idempotent — a replay files it twice. */
registerHandler<{ quiz_id: Id; body: QuizQuestionBody }>(WRITE.addQuizQuestion, {
  send: ({ quiz_id, body }) =>
    quizzesService.addQuestion(quiz_id, body).then((answer) => answer.question),
  idempotent: false,
  newId: idOfAnswer,
  collectionId: SET.teachingQuizRecords,
})

/** Rewriting one. Idempotent — the same fields over the same question. */
registerHandler<{ quiz_id: Id; question_id: Id; body: QuizQuestionBody }>(
  WRITE.updateQuizQuestion,
  {
    send: ({ quiz_id, question_id, body }) =>
      quizzesService.updateQuestion(quiz_id, question_id, body),
    idempotent: true,
    collectionId: SET.teachingQuizRecords,
  },
)

/** Deleting one. Idempotent: gone twice is gone. */
registerHandler<{ quiz_id: Id; question_id: Id }>(WRITE.removeQuizQuestion, {
  send: ({ quiz_id, question_id }) => quizzesService.removeQuestion(quiz_id, question_id),
  idempotent: true,
  collectionId: SET.teachingQuizRecords,
})
