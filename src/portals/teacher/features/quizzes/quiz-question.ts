import type {
  QuizQuestion,
  QuizQuestionBody,
  QuizQuestionType,
} from '../../../../api/quizzes/types.ts'
import { WRITE } from '../../../../db/ids.ts'
import { DRAWN_STATES, type OutboxOp } from '../../../../db/outbox.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import type { Row } from '../../../../features/collections/types.ts'

/**
 * One question of a quiz, as the teacher writing it works with.
 *
 * Two kinds, both of which the school marks: multiple choice, with up to four
 * options `op1`–`op4` and the right one named by its **number**; and
 * true/false, which writes its own two options. Prose is refused outright —
 * a question somebody has to read belongs on an assignment.
 */

export const QUIZ_KIND: Record<QuizQuestionType, string> = {
  multiple_choice: 'Multiple choice',
  true_false: 'True or false',
}

/** `op1`–`op4`: the school takes four, and at least two. */
export const OPTION_SLOTS = 4
export const MIN_OPTIONS = 2

/**
 * What a true/false question's two options are numbered. The school writes
 * them itself and the document does not show them, so this is the order a
 * person would write them in; an answer naming them otherwise is read off
 * `options` wherever it is shown, never off this.
 */
export const TRUE_FALSE: readonly [string, string] = ['True', 'False']

export type QuizQuestionValues = {
  question: string
  question_type: QuizQuestionType
  mark: string
  /** Always four boxes; the blank ones are dropped on the way out. */
  options: string[]
  /** The right option's number, `"1"`–`"4"`, or empty until one is marked. */
  correct: string
}

export const blankQuizQuestion = (): QuizQuestionValues => ({
  question: '',
  question_type: 'multiple_choice',
  mark: '1',
  options: ['', '', '', ''],
  // Nothing marked: a preselected answer key is one nobody chose.
  correct: '',
})

/** The options in their numbered order, as `[number, text]`. */
export function optionEntries(question: Pick<QuizQuestion, 'options'>): [string, string][] {
  return Object.entries(question.options ?? {})
    .filter(([, text]) => typeof text === 'string')
    .sort(([a], [b]) => Number(a) - Number(b))
}

/** The right option's words, where the school holds one. */
export function answerText(question: QuizQuestion): string | null {
  const key = question.correct_option == null ? '' : String(question.correct_option)
  if (!key) return null
  return question.options?.[key]?.trim() || null
}

/** A question opened for editing, back in the shape the form fills in. */
export function quizQuestionValues(question: QuizQuestion): QuizQuestionValues {
  const kind: QuizQuestionType =
    question.question_type === 'true_false' ? 'true_false' : 'multiple_choice'
  const options = Array.from({ length: OPTION_SLOTS }, (_, index) =>
    kind === 'multiple_choice' ? (question.options?.[String(index + 1)] ?? '') : '',
  )
  return {
    question: question.question ?? '',
    question_type: kind,
    mark: String(question.mark ?? 1),
    options,
    correct: question.correct_option == null ? '' : String(question.correct_option),
  }
}

/**
 * What writing a question sends.
 *
 * The options are closed up before they go: a teacher who fills boxes one,
 * two and four has written three options, and sending them as `op1`, `op2`,
 * `op4` would leave a hole the pupil sees as a blank choice. The answer key
 * moves with its option, so the number sent is the one it ends up at — which
 * is why the key is a number and not a position in the boxes.
 */
export function quizQuestionBody(values: QuizQuestionValues, order?: number): QuizQuestionBody {
  const mark = Number(String(values.mark).replace(/[^0-9]/g, '')) || 0
  const base = {
    question: values.question.trim(),
    question_type: values.question_type,
    mark,
    ...(order ? { question_order: order } : {}),
  }

  if (values.question_type === 'true_false') {
    return { ...base, correctans: values.correct }
  }

  const written = values.options
    .map((text, index) => ({ text: text.trim(), number: String(index + 1) }))
    .filter((option) => option.text)
  const at = written.findIndex((option) => option.number === values.correct)
  const body: QuizQuestionBody = {
    ...base,
    // Empty where the key points at a blank box, which the form refuses first.
    correctans: at === -1 ? '' : String(at + 1),
  }
  written.forEach((option, index) => {
    body[`op${index + 1}` as 'op1'] = option.text
  })
  return body
}

/** Why the form will not send it yet, or null when it can. */
export function quizQuestionProblem(values: QuizQuestionValues): string | null {
  if (!values.question.trim()) return 'Write the question'
  if (!/^\d+$/.test(values.mark.trim()) || Number(values.mark) < 1) {
    return 'A mark is a whole number, at least 1'
  }
  if (values.question_type === 'true_false') {
    return values.correct === '1' || values.correct === '2' ? null : 'Mark true or false'
  }
  const filled = values.options.filter((text) => text.trim()).length
  if (filled < MIN_OPTIONS) return `Write at least ${MIN_OPTIONS} options`
  // The quiz marks itself, so a question with no answer would mark the whole
  // class wrong on it — the school refuses to publish one for that reason.
  const chosen = Number(values.correct)
  if (!chosen || !values.options[chosen - 1]?.trim()) return 'Mark which option is right'
  return null
}

/** What the whole paper is worth, added up from the questions. */
export function quizMarks(questions: readonly QuizQuestion[]): number {
  return questions.reduce((sum, question) => sum + (question.mark ?? 0), 0)
}

/** The questions as the record's tab lists them. */
export function questionRows(questions: readonly QuizQuestion[]): Row[] {
  return [...questions]
    .sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id))
    .map((question, index) => ({
      id: String(question.id),
      n: String(question.order ?? index + 1),
      question: question.question?.trim() || `Question ${question.id}`,
      kind: QUIZ_KIND[question.question_type ?? 'multiple_choice'] ?? QUIZ_KIND.multiple_choice,
      mark: String(question.mark ?? 0),
      // A question the school cannot mark says so, rather than drawing a dash
      // that looks like a choice nobody needed.
      answer: answerText(question) ?? (question.markable === false ? 'No answer set' : BLANK),
    }))
}

// ── The queue, written through ─────────────────────────────────────────────

/** One question as the page draws it, wherever it currently lives. */
export type PageQuizQuestion = {
  /** The question's own id, or the op's local key for one still queued. */
  key: string
  question: QuizQuestion
  /** On this device and not the school's yet — edit and delete wait for the id. */
  waiting: boolean
}

/** A queued body, as the question it is about to become. */
function fromBody(body: Partial<QuizQuestionBody>): Partial<QuizQuestion> {
  const options: Record<string, string> = {}
  if (body.question_type === 'true_false') {
    options['1'] = TRUE_FALSE[0]
    options['2'] = TRUE_FALSE[1]
  } else {
    for (let slot = 1; slot <= OPTION_SLOTS; slot += 1) {
      const text = body[`op${slot}` as 'op1']
      if (text) options[String(slot)] = text
    }
  }
  return {
    ...(body.question !== undefined ? { question: body.question } : {}),
    ...(body.question_type ? { question_type: body.question_type } : {}),
    ...(body.mark !== undefined ? { mark: body.mark } : {}),
    ...(Object.keys(options).length ? { options } : {}),
    ...(body.correctans !== undefined ? { correct_option: body.correctans } : {}),
  }
}

/**
 * The questions of one quiz with this device's queued work written through —
 * the same composition as the assignment questions page: a queued rewrite
 * shows the new wording, a queued delete takes the question off, and a queued
 * new one appears at the end. Later ops win, in `seq` order.
 */
export function composeQuizQuestions(
  written: readonly QuizQuestion[],
  ops: readonly OutboxOp[],
  quizId: string,
): PageQuizQuestion[] {
  const mine = (payload: unknown): boolean =>
    String((payload as { quiz_id?: unknown }).quiz_id) === quizId

  const updates = new Map<string, Partial<QuizQuestionBody>>()
  const removed = new Set<string>()
  const added: { key: string; body: QuizQuestionBody }[] = []

  for (const op of [...ops].sort((a, b) => a.seq - b.seq)) {
    if (!DRAWN_STATES.includes(op.state) || !mine(op.payload)) continue
    if (op.handler === WRITE.addQuizQuestion && typeof op.targetKey === 'string') {
      added.push({ key: op.targetKey, body: (op.payload as { body: QuizQuestionBody }).body })
    }
    if (op.handler === WRITE.updateQuizQuestion) {
      const { question_id, body } = op.payload as {
        question_id: unknown
        body: QuizQuestionBody
      }
      updates.set(String(question_id), { ...updates.get(String(question_id)), ...body })
    }
    if (op.handler === WRITE.removeQuizQuestion) {
      removed.add(String((op.payload as { question_id: unknown }).question_id))
    }
  }

  const kept = [...written]
    .sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id))
    .filter((question) => !removed.has(String(question.id)))
    .map((question): PageQuizQuestion => {
      const update = updates.get(String(question.id))
      return {
        key: String(question.id),
        question: update ? { ...question, ...fromBody(update) } : question,
        waiting: false,
      }
    })

  return [
    ...kept,
    ...added.map(
      ({ key, body }): PageQuizQuestion => ({
        key,
        question: { id: 0, order: null, ...fromBody(body) },
        waiting: true,
      }),
    ),
  ]
}

// ── What the school has taken, before the set catches up ───────────────────

/**
 * Writes the school accepted in this sitting of the page, held until the
 * quiz's record is fetched again.
 *
 * Measured on the live school 2026-10-02: a question added, rewritten or a
 * quiz opened answered at once, and the page went on drawing the old record
 * for several seconds — "Question added" over "No questions yet" — because
 * the record is a fan-out the drain refetches after the write, not with it.
 * The assignment questions page met the same thing (`withFreshQuestions`).
 *
 * Every part is idempotent against the school's own answer, which is what
 * makes it safe to keep for the page's lifetime: an added question is dropped
 * once its id is in the record, a rewrite writes the values the record will
 * hold anyway, and a removed question is one the record no longer has.
 */
export type Landed = {
  added: QuizQuestion[]
  rewritten: Record<string, Partial<QuizQuestionBody>>
  removed: string[]
}

export const NOTHING_LANDED: Landed = { added: [], rewritten: {}, removed: [] }

export function withLanded(written: readonly QuizQuestion[], landed: Landed): QuizQuestion[] {
  const known = new Set(written.map((question) => String(question.id)))
  const gone = new Set(landed.removed)
  return [...written, ...landed.added.filter((question) => !known.has(String(question.id)))]
    .filter((question) => !gone.has(String(question.id)))
    .map((question) => {
      const body = landed.rewritten[String(question.id)]
      return body ? { ...question, ...fromBody(body) } : question
    })
}
