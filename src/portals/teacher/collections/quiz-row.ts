import type { Quiz } from '../../../api/quizzes/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'
import {
  schoolMillis,
  schoolTime,
  toDateTimeInput,
  when,
} from '../../../features/collections/when.ts'

/**
 * The teacher's register of quizzes, off `GET /quizzes`.
 *
 * A quiz's life is the school's `status` first — a draft is not open whatever
 * its dates say, because publishing is its own deliberate step — and its
 * window second.
 */

export type QuizState = 'Draft' | 'Open' | 'Not open yet' | 'Closed'

export function stateOf(quiz: Quiz, now = Date.now()): QuizState {
  const status = quiz.status?.trim().toLowerCase()
  if (status === 'draft' || !status) return 'Draft'
  if (status === 'closed') return 'Closed'

  const closes = schoolMillis(quiz.closes)
  if (closes !== null && closes <= now) return 'Closed'
  const opens = schoolMillis(quiz.opens)
  return opens !== null && opens > now ? 'Not open yet' : 'Open'
}

/** Drafts first — they are the work still to do — then what is live, then what is over. */
const ORDER: Record<QuizState, number> = {
  Draft: 0,
  Open: 1,
  'Not open yet': 2,
  Closed: 3,
}

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

function figure(value: number | null | undefined): string {
  return value == null ? '' : String(value)
}

export function quizRows(quizzes: Quiz[], now = Date.now()): Row[] {
  return quizzes
    .map((quiz) => ({ quiz, state: stateOf(quiz, now) }))
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || b.quiz.id - a.quiz.id)
    .map(({ quiz, state }) => ({
      id: String(quiz.id),
      name: quiz.name?.trim() || `Quiz ${quiz.id}`,
      subject: text(quiz.subject),
      klass: text(quiz.class),
      arms: quiz.class_arm_id == null ? 'Every arm' : 'One arm',
      marks: String(quiz.total_marks ?? 0),
      clock: quiz.duration_minutes ? `${quiz.duration_minutes} minutes` : 'No clock',
      pass: quiz.pass_mark_percent == null ? 'None' : `${quiz.pass_mark_percent}%`,
      // A bank of thirty can be a paper of ten; blank asks them all.
      asks: quiz.asks ? `${quiz.asks} questions` : 'Every question',
      order: quiz.shuffled ? 'Shuffled per pupil' : 'As written',
      opens: when(schoolTime(quiz.opens), true),
      closes: when(schoolTime(quiz.closes), true),
      state,
      description: text(quiz.description),

      // What the form opens on. The display strings above parse to nothing.
      status: quiz.status ?? '',
      subject_id: figure(quiz.subject_id),
      department_id: figure(quiz.department_id),
      class_arm_id: figure(quiz.class_arm_id),
      duration: figure(quiz.duration_minutes),
      pass_mark: figure(quiz.pass_mark_percent),
      total_questions: figure(quiz.asks),
      shuffled: quiz.shuffled ? 'yes' : 'no',
      opens_at: toDateTimeInput(quiz.opens),
      closes_at: toDateTimeInput(quiz.closes),
    }))
}

/** The figures above the register, counted off its own rows. */
export function quizTally(rows: Row[]) {
  const count = (state: QuizState) => rows.filter((row) => row.state === state).length
  return { quizzes: rows.length, open: count('Open'), drafts: count('Draft') }
}
