import { quizzesService } from '@/api/quizzes/service'
import type { Quiz, QuizOptions, QuizRecord, QuizSittings } from '@/api/quizzes/types'
import { schoolCollection, schoolDocument } from '../collection'
import { SET } from '../ids'
import { mergeHeld } from '../merge-held'
import { readSnapshot } from '../snapshot'

/**
 * The teaching side of quizzes, on the teacher's own device.
 *
 * Shaped like `set-assignments.ts`, which it was split from: the list syncs
 * with the teacher's shell, and the per-quiz sets below it fan out over the
 * list and are preloaded by the routes that read them. A refusing slice keeps
 * the copy the device already held (`mergeHeld`), so a flaky refetch cannot
 * erase a quiz's questions.
 *
 * Every write goes through the queue, so a quiz can be set and written with no
 * connection. Publishing is queued too: it is a teacher's decision, and the
 * school still refuses one with no questions or an unanswered question — which
 * the queue raises as a refusal, word for word.
 */

/** A teacher's quizzes are counted in tens; one page is the whole list. */
const ALL = 200

export const teachingQuizzes = schoolCollection<Quiz, number>({
  id: SET.teachingQuizzes,
  fetch: () => quizzesService.list({ limit: ALL }),
  getKey: (quiz) => quiz.id,
  schemaVersion: 1,
})

/** Whose quizzes the fan-outs cover, off the list's own copy where there is one. */
async function heldQuizzes(): Promise<Quiz[]> {
  return readSnapshot<Quiz>(SET.teachingQuizzes) ?? (await quizzesService.list({ limit: ALL }))
}

/**
 * Each quiz read whole, keyed by the quiz: `GET /quizzes/{id}` is the only
 * answer carrying the questions with their answer key, how many have sat it
 * and the school's own sentence for why it cannot be published yet — so it is
 * kept as one document per quiz rather than taken apart.
 */
export type QuizRecordDoc = QuizRecord & { id: number }

export const teachingQuizRecords = schoolCollection<QuizRecordDoc, number>({
  id: SET.teachingQuizRecords,
  fetch: async () => {
    const quizzes = await heldQuizzes()
    const held = new Map(
      (readSnapshot<QuizRecordDoc>(SET.teachingQuizRecords) ?? []).map((doc) => [doc.id, doc]),
    )
    const results = await Promise.all(
      quizzes.map(async (quiz) => ({
        key: quiz.id,
        fresh: await quizzesService
          .get(quiz.id)
          .then((record): QuizRecordDoc => ({ ...record, id: quiz.id }))
          .catch(() => undefined),
      })),
    )
    return mergeHeld(results, held)
  },
  getKey: (doc) => doc.id,
  schemaVersion: 1,
})

/** One quiz's sittings and the summary beside them, keyed by the quiz. */
export type QuizSittingsDoc = QuizSittings & { id: number }

export const teachingQuizSittings = schoolCollection<QuizSittingsDoc, number>({
  id: SET.teachingQuizSittings,
  fetch: async () => {
    const quizzes = await heldQuizzes()
    const held = new Map(
      (readSnapshot<QuizSittingsDoc>(SET.teachingQuizSittings) ?? []).map((doc) => [doc.id, doc]),
    )
    const results = await Promise.all(
      // A draft has never been open, so nobody can have sat it; asking would
      // be one request per unfinished paper for an answer known in advance.
      quizzes
        .filter((quiz) => quiz.status !== 'draft')
        .map(async (quiz) => ({
          key: quiz.id,
          fresh: await quizzesService
            .sittings(quiz.id)
            .then((doc): QuizSittingsDoc => ({ ...doc, id: quiz.id }))
            .catch(() => undefined),
        })),
    )
    return mergeHeld(results, held)
  },
  getKey: (doc) => doc.id,
  schemaVersion: 1,
})

/**
 * What this teacher may set a quiz for. Kept on the device for the same reason
 * every other dropdown is: a form that cannot offer the classes is a form
 * nobody can fill in offline. Its `arms_by_class` is also what the assignment
 * form's arm box reads — see the `my-class-arms` feed.
 */
export const teachingQuizOptions = schoolDocument<QuizOptions>({
  id: SET.teachingQuizOptions,
  fetch: () => quizzesService.options(),
  schemaVersion: 1,
})
