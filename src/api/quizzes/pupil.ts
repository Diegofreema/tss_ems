/**
 * The pupil's half of quizzes, read off answers nobody has seen.
 *
 * The school's collection of 2026-10-02 documents every pupil endpoint in
 * words — what it does, what it never sends — and shows not one answer. So
 * each reader here takes the likeliest spellings, in the order this API spells
 * its other answers (`quiz` beside a list, `seconds_left`, `out_of`), and the
 * tests beside it hold them. **This is the module to correct first** when the
 * controller is deployed and a real answer can be read: a wrong reader looks
 * exactly like an empty column, and nothing throws.
 *
 * What the document *does* state is built in as fact:
 * - `seconds_left` is null on a paper with no clock;
 * - `resumed` says whether opening it again picked up an earlier sitting;
 * - `choice` is the option's number, and an empty one clears an answer;
 * - `expired: true` from a heartbeat means the paper has been marked;
 * - `out_of` is the marks that could be marked, and `unmarkable_questions`
 *   names any left out; `already` says a second hand-in did not re-mark.
 */

// Relative imports only, so `node --test` can load this — see CLAUDE.md.

type Bag = Record<string, unknown>

function bag(value: unknown): Bag | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Bag)
    : undefined
}

function first(from: Bag | undefined, keys: readonly string[]): unknown {
  if (!from) return undefined
  for (const key of keys) {
    const value = from[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function word(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

function amount(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function flag(value: unknown): boolean | undefined {
  if (value === true || value === 1 || value === 'true' || value === '1') return true
  if (value === false || value === 0 || value === 'false' || value === '0') return false
  return undefined
}

/** The list inside an answer, under whichever of the likely keys holds it. */
function listIn(answer: unknown, keys: readonly string[]): unknown[] {
  if (Array.isArray(answer)) return answer
  const from = bag(answer)
  for (const key of keys) {
    if (Array.isArray(from?.[key])) return from[key] as unknown[]
  }
  return []
}

// ── The list ───────────────────────────────────────────────────────────────

/** One quiz on the pupil's list. */
export type PupilQuiz = {
  id: number
  name: string
  subject?: string
  className?: string
  description?: string
  /** Null where the paper has no clock. */
  minutes: number | null
  passMark: number | null
  marks: number | null
  asks: number | null
  opens?: string
  closes?: string
  status?: string
  /** Handed in. A closed quiz is listed only once it has been. */
  sat: boolean
  /** Opened and not handed in — opening it again resumes. */
  started: boolean
}

/** Whatever the row says about this pupil's own sitting, nested or flat. */
function sittingOf(row: Bag): Bag | undefined {
  return bag(first(row, ['my_sitting', 'sitting', 'attempt', 'my_attempt']))
}

export function pupilQuizOf(value: unknown): PupilQuiz | undefined {
  const row = bag(value)
  const id = amount(first(row, ['id', 'quiz_id']))
  if (!row || id === undefined) return undefined
  const sitting = sittingOf(row)
  const state = word(first(row, ['my_status', 'sitting_status'])) ?? word(sitting?.status)

  const sat =
    flag(first(row, ['sat', 'has_sat', 'submitted', 'completed'])) ??
    (state ? ['submitted', 'completed', 'marked', 'finished'].includes(state.toLowerCase()) : undefined) ??
    Boolean(first(sitting, ['submitted_at', 'finished_at', 'completed_at']))
  const started =
    !sat &&
    (flag(first(row, ['in_progress', 'started'])) ??
      (state ? ['in_progress', 'started', 'open'].includes(state.toLowerCase()) : undefined) ??
      Boolean(sitting))

  return {
    id,
    name: word(first(row, ['name', 'quizname', 'title'])) ?? `Quiz ${id}`,
    subject: word(row.subject),
    className: word(row.class),
    description: word(row.description),
    minutes: amount(first(row, ['duration_minutes', 'duration'])) ?? null,
    passMark: amount(first(row, ['pass_mark_percent', 'pass_mark'])) ?? null,
    marks: amount(row.total_marks) ?? null,
    asks: amount(first(row, ['asks', 'total_questions', 'question_count'])) ?? null,
    opens: word(first(row, ['opens', 'start_date'])),
    closes: word(first(row, ['closes', 'end_date'])),
    status: word(row.status),
    sat,
    started,
  }
}

/** `GET /quizzes/mine`. An answer with no list under any likely key is refused, not read as none. */
export function myQuizzesOf(answer: unknown): PupilQuiz[] {
  const rows = listIn(answer, ['quizzes', 'items', 'data'])
  if (!rows.length && !Array.isArray(answer) && !Array.isArray(bag(answer)?.quizzes)) {
    throw new Error('The school answered, but not with a list of quizzes.')
  }
  return rows.map(pupilQuizOf).filter((quiz): quiz is PupilQuiz => quiz !== undefined)
}

// ── The paper ──────────────────────────────────────────────────────────────

export type PaperQuestion = {
  id: number
  question: string
  kind: 'multiple_choice' | 'true_false'
  mark: number | null
  /** `[number, text]` in the option's own order. The number is what is sent. */
  options: [string, string][]
  /** The option's number already chosen, or empty. */
  chosen: string
}

export type Paper = {
  name?: string
  questions: PaperQuestion[]
  /** Null when the paper has no clock. */
  secondsLeft: number | null
  resumed: boolean
}

function optionsOf(value: unknown): [string, string][] {
  if (Array.isArray(value)) {
    // A list of `{number|id, text}` rather than the teacher's map.
    return value
      .map((option, index): [string, string] | undefined => {
        const one = bag(option)
        const text = word(first(one, ['text', 'option_text', 'option', 'label']))
        const number = word(first(one, ['number', 'key', 'value', 'id'])) ?? String(index + 1)
        return text === undefined ? undefined : [number, text]
      })
      .filter((pair): pair is [string, string] => pair !== undefined)
  }
  return Object.entries(bag(value) ?? {})
    .filter((pair): pair is [string, string] => typeof pair[1] === 'string')
    .sort(([a], [b]) => Number(a) - Number(b))
}

export function paperQuestionOf(value: unknown): PaperQuestion | undefined {
  const row = bag(value)
  const id = amount(first(row, ['id', 'question_id']))
  if (!row || id === undefined) return undefined
  const kind = row.question_type === 'true_false' ? 'true_false' : 'multiple_choice'
  let options = optionsOf(row.options)
  // The school writes a true/false question's two options itself; where it
  // does not send them back, they are the two a person would write.
  if (!options.length && kind === 'true_false') {
    options = [
      ['1', 'True'],
      ['2', 'False'],
    ]
  }
  return {
    id,
    question: word(first(row, ['question', 'question_text', 'text'])) ?? `Question ${id}`,
    kind,
    mark: amount(first(row, ['mark', 'points'])) ?? null,
    options,
    chosen: word(first(row, ['chosen', 'choice', 'my_choice', 'answer', 'selected'])) ?? '',
  }
}

/** `POST /quizzes/{id}/start` and `GET /quizzes/{id}/paper` — both hand back the paper. */
export function paperOf(answer: unknown): Paper {
  const from = bag(answer)
  const quiz = bag(first(from, ['quiz', 'paper']))
  const rows = listIn(answer, ['questions']).length
    ? listIn(answer, ['questions'])
    : listIn(quiz, ['questions'])
  const answers = bag(first(from, ['answers', 'choices']))

  const questions = rows
    .map(paperQuestionOf)
    .filter((question): question is PaperQuestion => question !== undefined)
    // Answers sent beside the questions rather than on them, keyed by question.
    .map((question) =>
      question.chosen || !answers
        ? question
        : { ...question, chosen: word(answers[String(question.id)]) ?? '' },
    )

  return {
    name: word(first(quiz, ['name', 'quizname'])) ?? word(from?.name),
    questions,
    secondsLeft: clockOf(answer).secondsLeft,
    resumed: flag(from?.resumed) ?? false,
  }
}

// ── The clock ──────────────────────────────────────────────────────────────

/** `POST /quizzes/{id}/heartbeat`, and the clock on a start or a paper. */
export function clockOf(answer: unknown): { secondsLeft: number | null; expired: boolean } {
  const from = bag(answer)
  const sitting = bag(first(from, ['sitting', 'attempt']))
  const left = amount(first(from, ['seconds_left', 'time_remaining'])) ??
    amount(first(sitting, ['seconds_left', 'time_remaining']))
  return {
    secondsLeft: left === undefined ? null : Math.max(0, Math.floor(left)),
    expired: flag(first(from, ['expired'])) ?? flag(first(sitting, ['expired'])) ?? false,
  }
}

// ── The result ─────────────────────────────────────────────────────────────

export type QuizResult = {
  score: number | null
  /** The marks that could be marked — not always the marks asked. */
  outOf: number | null
  percent: number | null
  /** Null where there is nothing to say: no pass mark, or not marked yet. */
  passed: boolean | null
  passMark: number | null
  /** A second hand-in, which did not re-mark. */
  already: boolean
  /** Questions left out of the mark because their answer was never recorded. */
  unmarkable: number
  submittedAt?: string
}

/** `POST /quizzes/{id}/submit` and `GET /quizzes/{id}/result`. */
export function resultOf(answer: unknown): QuizResult {
  const from = bag(answer)
  const inner = bag(first(from, ['result', 'sitting', 'score_card'])) ?? from
  const read = (keys: readonly string[]) => first(inner, keys) ?? first(from, keys)

  const score = amount(read(['score', 'total_score', 'marks', 'marks_scored']))
  const outOf = amount(read(['out_of', 'total_marks', 'max_marks']))
  const given = amount(read(['percentage', 'percent']))
  const percent =
    given ?? (score !== undefined && outOf ? Math.round((score / outOf) * 1000) / 10 : undefined)
  const unmarkable = read(['unmarkable_questions', 'unmarkable'])

  return {
    score: score ?? null,
    outOf: outOf ?? null,
    percent: percent ?? null,
    passed: flag(read(['passed'])) ?? null,
    passMark: amount(read(['pass_mark', 'pass_mark_percent'])) ?? null,
    already: flag(first(from, ['already'])) ?? false,
    unmarkable: Array.isArray(unmarkable) ? unmarkable.length : (amount(unmarkable) ?? 0),
    submittedAt: word(read(['submitted_at', 'finished_at', 'completed_at'])),
  }
}
