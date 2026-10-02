import type { Id } from '../types'

export const quizKeys = {
  all: ['quizzes'] as const,
  /** The pupil's sitting. Never cached for long: the clock is the school's. */
  paper: (quizId: Id) => [...quizKeys.all, 'paper', String(quizId)] as const,
  result: (quizId: Id) => [...quizKeys.all, 'result', String(quizId)] as const,
}
