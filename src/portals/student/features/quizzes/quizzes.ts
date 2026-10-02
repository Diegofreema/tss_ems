import type { PupilQuiz } from '../../../../api/quizzes/pupil.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { schoolMillis, schoolTime, when } from '../../../../features/collections/when.ts'

/**
 * The pupil's own list of quizzes, off `GET /quizzes/mine`.
 *
 * The school lists only what this pupil may sit now, and the closed ones they
 * sat — a quiz that has not opened yet is not listed at all — so most of the
 * states are already decided by the list. The window is still read, because a
 * quiz listed this morning may have closed by the time the device shows it.
 */

export type QuizState = 'Open' | 'Carry on' | 'Sat' | 'Not open yet' | 'Closed'

export function stateOf(quiz: PupilQuiz, now = Date.now()): QuizState {
  if (quiz.sat) return 'Sat'
  if (quiz.status && quiz.status !== 'active') return 'Closed'
  const closes = schoolMillis(quiz.closes)
  if (closes !== null && closes <= now) return 'Closed'
  const opens = schoolMillis(quiz.opens)
  if (opens !== null && opens > now) return 'Not open yet'
  return quiz.started ? 'Carry on' : 'Open'
}

/** What can be sat now first — a paper already begun before one not yet started. */
const ORDER: Record<QuizState, number> = {
  'Carry on': 0,
  Open: 1,
  'Not open yet': 2,
  Sat: 3,
  Closed: 4,
}

export function quizRows(quizzes: PupilQuiz[], now = Date.now()): Row[] {
  return quizzes
    .map((quiz) => ({ quiz, state: stateOf(quiz, now) }))
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || b.quiz.id - a.quiz.id)
    .map(({ quiz, state }) => ({
      id: String(quiz.id),
      name: quiz.name,
      subject: quiz.subject ?? BLANK,
      clock: quiz.minutes ? `${quiz.minutes} min` : 'No clock',
      marks: quiz.marks == null ? BLANK : String(quiz.marks),
      closes: when(schoolTime(quiz.closes), true),
      state,
    }))
}

export function quizTally(rows: Row[]) {
  const count = (...states: QuizState[]) =>
    rows.filter((row) => states.includes(row.state as QuizState)).length
  return { open: count('Open', 'Carry on'), sat: count('Sat') }
}
