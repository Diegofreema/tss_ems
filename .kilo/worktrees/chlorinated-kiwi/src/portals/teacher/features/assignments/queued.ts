import type {
  AssignmentQuestion,
  GradeBody,
  MarkedSubmission,
  QuestionBody,
} from '../../../../api/set-assignments/types.ts'
import { WRITE } from '../../../../db/ids.ts'
import { DRAWN_STATES, type OutboxOp } from '../../../../db/outbox.ts'
import type { Row } from '../../../../features/collections/types.ts'

/**
 * The CBT pages' view of the queue: what this device has written about an
 * assignment's questions and its scripts that the school has not heard yet.
 *
 * Read from the outbox and composed onto the school's rows, never written
 * into a collection — the same division as the attendance sheet and the score
 * grid, and for the same reason: an op's overlay exists exactly as long as
 * the op does, and disappears when the school's own answer replaces it.
 *
 * Only ops still expected to land are drawn — `DRAWN_STATES`, the same rule
 * every register follows. The states a person has to decide about belong to
 * the pending-work drawer.
 */
const drawn = (op: OutboxOp): boolean => DRAWN_STATES.includes(op.state)

const bySeq = (ops: readonly OutboxOp[]): OutboxOp[] => [...ops].sort((a, b) => a.seq - b.seq)

/** The queued body's fields written over a question's own. */
function fromBody(body: QuestionBody): Partial<AssignmentQuestion> {
  return {
    question_text: body.question_text,
    question_type: body.question_type,
    points: body.points,
    options: body.options?.map((option) => ({
      option_text: option.option_text,
      is_correct: option.is_correct ?? false,
    })),
  }
}

/** One question as the page draws it, wherever it currently lives. */
export type PageQuestion = {
  /** The question's own id, or the op's local key for one still queued. */
  key: string
  question: AssignmentQuestion
  /** On this device and not the school's yet — edit and delete wait for the id. */
  waiting: boolean
}

/**
 * The questions of one assignment, with this device's queued work written
 * through: a queued rewrite shows the new wording, a queued delete takes the
 * question off, and a queued new question appears at the end, where a new
 * question goes. Later ops win, in `seq` order — rewriting twice leaves the
 * second wording, which is the order the teacher did it in.
 */
export function composeQuestions(
  written: readonly AssignmentQuestion[],
  ops: readonly OutboxOp[],
  assignmentId: string,
): PageQuestion[] {
  const mine = (payload: unknown): boolean =>
    String((payload as { assignment_id?: unknown }).assignment_id) === assignmentId

  const updates = new Map<string, QuestionBody>()
  const removed = new Set<string>()
  const added: { key: string; body: QuestionBody }[] = []

  for (const op of bySeq(ops)) {
    if (!drawn(op) || !mine(op.payload)) continue

    if (op.handler === WRITE.addQuestion && typeof op.targetKey === 'string') {
      added.push({ key: op.targetKey, body: (op.payload as { body: QuestionBody }).body })
    }
    if (op.handler === WRITE.updateQuestion) {
      const { question_id, body } = op.payload as { question_id: unknown; body: QuestionBody }
      updates.set(String(question_id), body)
    }
    if (op.handler === WRITE.removeQuestion) {
      const { question_id } = op.payload as { question_id: unknown }
      removed.add(String(question_id))
    }
  }

  const kept = written
    .filter((question) => !removed.has(String(question.id)))
    .map((question): PageQuestion => {
      const update = updates.get(String(question.id))
      return {
        key: String(question.id),
        question: update ? { ...question, ...fromBody(update) } : question,
        // A queued rewrite still edits freely — the row has a real id, and a
        // second rewrite simply queues after the first.
        waiting: false,
      }
    })

  return [
    ...kept,
    ...added.map(
      ({ key, body }): PageQuestion => ({
        key,
        question: { id: 0, order_number: null, ...fromBody(body) },
        waiting: true,
      }),
    ),
  ]
}

/**
 * Questions the school has already taken, but the set has not caught up with.
 *
 * Composed **before** the queue's own overlay rather than after it, so a
 * question added a moment ago behaves like any other: rewriting it shows the
 * new wording, deleting it takes it off. Appended after it would be a row the
 * overlay could not reach, and a teacher who deleted a question they had just
 * written would watch it come straight back.
 *
 * It is a stopgap with a natural end: the id is the school's own, so the
 * moment the set is fetched again the row is in `written` and this drops it.
 * That is what makes it safe where an optimistic write into the collection is
 * not — nothing here outlives the answer it was standing in for.
 */
export function withFreshQuestions(
  written: readonly AssignmentQuestion[],
  fresh: readonly AssignmentQuestion[],
): AssignmentQuestion[] {
  if (fresh.length === 0) return [...written]
  const known = new Set(written.map((question) => String(question.id)))
  return [...written, ...fresh.filter((question) => !known.has(String(question.id)))]
}

/** The grades this device has queued, by submission id. Later wins. */
export function queuedGrades(ops: readonly OutboxOp[]): ReadonlyMap<string, GradeBody> {
  const grades = new Map<string, GradeBody>()
  for (const op of bySeq(ops)) {
    if (op.handler !== WRITE.gradeSubmission || !drawn(op)) continue
    const { submission_id, body } = op.payload as { submission_id: unknown; body: GradeBody }
    grades.set(String(submission_id), body)
  }
  return grades
}

/** What a queued grade adds up to — the school scores nothing itself. */
export function gradeTotal(grade: GradeBody): number {
  return Object.values(grade.scores).reduce((sum, score) => sum + score, 0)
}

/**
 * The submission list with this device's queued marks written over it: a
 * script marked on this device reads "Marked" with its total, not as a button
 * that did nothing. The banner and the drawer say it has not got there yet.
 */
export function withQueuedGrades(rows: Row[], ops: readonly OutboxOp[]): Row[] {
  const grades = queuedGrades(ops)
  if (grades.size === 0) return rows
  return rows.map((row) => {
    const grade = grades.get(row.id)
    if (!grade) return row
    return { ...row, score: String(gradeTotal(grade)), state: 'Marked' }
  })
}

/**
 * The school's own sat / marked / waiting counters, moved by what this device
 * has queued — a counter reading "3 waiting" beside a list showing none left
 * would be the page disagreeing with itself.
 */
export function gradedCounters(
  counters: { sat: number; marked: number; waiting: number },
  rows: readonly Row[],
  ops: readonly OutboxOp[],
): { sat: number; marked: number; waiting: number } {
  const grades = queuedGrades(ops)
  // Only marks for scripts the school still calls unmarked move the figures —
  // a queued *re*grade changes a mark, not the count of marked scripts.
  const fresh = rows.filter((row) => grades.has(row.id) && row.state === 'To mark').length
  /*
   * Papers the answer key has already settled are not work.
   *
   * "Waiting on you: 1" against a paper of four multiple-choice questions was
   * the tile claiming a job nobody had — there is not a figure on that sheet a
   * teacher can change. They are counted as marked here because by this
   * device's reading they are, which is the same licence the queued ones take.
   */
  const settled = rows.filter((row) => row.state === 'Marked by the system').length
  return {
    sat: counters.sat,
    marked: counters.marked + fresh + settled,
    waiting: Math.max(0, counters.waiting - fresh - settled),
  }
}

/**
 * One script with a queued grade written into its answers, so the sheet
 * reopens on the marks the teacher gave rather than proposing them again —
 * and reads as marked, which by this device's account it is.
 */
export function withQueuedScores(
  script: MarkedSubmission,
  grade: GradeBody | undefined,
): MarkedSubmission {
  if (!grade) return script
  return {
    submission: {
      ...script.submission,
      total_score: gradeTotal(grade),
      ...(grade.comment !== undefined ? { teacher_comments: grade.comment } : {}),
    },
    answers: (script.answers ?? []).map((answer) => {
      const score = grade.scores[String(answer.answer_id)]
      return score === undefined ? answer : { ...answer, score }
    }),
  }
}
