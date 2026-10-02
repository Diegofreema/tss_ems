import { request, requestBlob } from '../client.ts'
import type { Id } from '../types.ts'
import type {
  PublishBody,
  Quiz,
  QuizBody,
  QuizListParams,
  QuizOptions,
  QuizQuestion,
  QuizQuestionBody,
  QuizRecord,
  QuizSittings,
} from './types.ts'

/**
 * `/quizzes` — objective papers that mark themselves, split off
 * `/setassignments` on 2026-10-02. The teacher's half sets them and reads the
 * results; the pupil's half (`mine` and below) sits them.
 *
 * Every write is a POST, as everywhere on this API, and publishing is its own
 * endpoint rather than a status field because it is the change that cannot be
 * quietly undone: pupils start sitting it, and the class and its guardians are
 * told.
 */
export const quizzesService = {
  // ── The teacher's ────────────────────────────────────────────────────────

  options: () => request<QuizOptions>('quizzes/options'),

  /** A teacher's own; the office sees all of them. */
  list: (params: QuizListParams = {}) =>
    request<Record<string, unknown>>('quizzes', { query: { ...params } }).then(quizzesOf),

  get: (quizId: Id) => request<QuizRecord>(`quizzes/${quizId}`),

  /** Lands as a draft: it has no questions yet. */
  create: (body: QuizBody) => request<{ quiz: Quiz }>('quizzes', { method: 'POST', body }),

  update: (quizId: Id, body: QuizBody) =>
    request<{ quiz: Quiz }>(`quizzes/${quizId}`, { method: 'POST', body }),

  publish: (quizId: Id, body: PublishBody) =>
    request<unknown>(`quizzes/${quizId}/publish`, { method: 'POST', body }),

  remove: (quizId: Id) => request<unknown>(`quizzes/${quizId}`, { method: 'DELETE' }),

  addQuestion: (quizId: Id, body: QuizQuestionBody) =>
    request<{ question: QuizQuestion }>(`quizzes/${quizId}/questions`, {
      method: 'POST',
      body,
    }),

  updateQuestion: (quizId: Id, questionId: Id, body: Partial<QuizQuestionBody>) =>
    request<{ question: QuizQuestion }>(`quizzes/${quizId}/questions/${questionId}`, {
      method: 'POST',
      body,
    }),

  removeQuestion: (quizId: Id, questionId: Id) =>
    request<unknown>(`quizzes/${quizId}/questions/${questionId}`, { method: 'DELETE' }),

  sittings: (quizId: Id) => request<QuizSittings>(`quizzes/${quizId}/sittings`),

  /** A CSV, not JSON — one row per pupil. */
  export: (quizId: Id) => requestBlob(`quizzes/${quizId}/export`),

  // ── The pupil's ──────────────────────────────────────────────────────────
  //
  // None of these answers is shown in the school's document, so each is
  // handed back as it came and read by `portals/student/features/quizzes/
  // paper.ts`, which takes the likeliest spellings and is tested on them.

  /** Open quizzes for this pupil's class, and closed ones they sat. */
  mine: () => request<unknown>('quizzes/mine'),

  /** Starts the clock — or resumes it, which never sets it back. */
  start: (quizId: Id) => request<unknown>(`quizzes/${quizId}/start`, { method: 'POST', body: {} }),

  /** The questions and whatever this pupil has already chosen. Never the key. */
  paper: (quizId: Id) => request<unknown>(`quizzes/${quizId}/paper`),

  /** One answer, saved as it is given. An empty `choice` clears it. */
  answer: (quizId: Id, body: { question_id: Id; choice: string }) =>
    request<unknown>(`quizzes/${quizId}/answer`, { method: 'POST', body }),

  /** The time left — and, once it has run out, the paper marked on what was answered. */
  heartbeat: (quizId: Id) =>
    request<unknown>(`quizzes/${quizId}/heartbeat`, { method: 'POST', body: {} }),

  /** Marks it there and then. A second call does not re-mark. */
  submit: (quizId: Id) => request<unknown>(`quizzes/${quizId}/submit`, { method: 'POST', body: {} }),

  /** A 404 until the paper is handed in. */
  result: (quizId: Id) => request<unknown>(`quizzes/${quizId}/result`),
}

/**
 * The list, under whichever key the school puts it. The document shows no
 * answer for `GET /quizzes`; `quizzes` is the one its siblings would use
 * (`papers`, `submissions`), and an answer under none of them is a refusal
 * rather than an empty register — see `db/collection.ts`.
 */
export function quizzesOf(data: Record<string, unknown>): Quiz[] {
  for (const key of ['quizzes', 'items', 'data']) {
    if (Array.isArray(data[key])) return data[key] as Quiz[]
  }
  if (Array.isArray(data)) return data as Quiz[]
  throw new Error('The school answered, but not with a list of quizzes.')
}
