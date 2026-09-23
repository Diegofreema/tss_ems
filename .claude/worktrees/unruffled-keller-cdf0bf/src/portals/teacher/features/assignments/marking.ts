import type {
  AssignmentSubmission,
  GradeBody,
  MarkingAnswer,
} from '../../../../api/set-assignments/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { when } from '../../../../features/collections/when.ts'

/**
 * Marking what the pupils of one assignment sent back.
 *
 * The school scores nothing itself — every answer of a submitted assignment
 * comes back with `score: null`, multiple choice included — so every mark here
 * is the teacher's. What the school does send is the answer key, on the
 * options, and that is enough for the sheet to propose the multiple-choice
 * marks rather than make a teacher work them out by eye.
 */

export type SubmissionState = 'To mark' | 'Marked'

/**
 * Whether anybody has marked this submission.
 *
 * `graded` is the school's own answer where it sends one. A total on its own
 * is the fallback, for the marking view, which sends `graded_at` instead.
 */
export function stateOf(submission: AssignmentSubmission): SubmissionState {
  const graded = submission.graded ?? submission.total_score != null
  return graded ? 'Marked' : 'To mark'
}

/** What still needs marking comes first; within that, whoever submitted first. */
const ORDER: Record<SubmissionState, number> = { 'To mark': 0, Marked: 1 }

export function submissionRows(submissions: AssignmentSubmission[]): Row[] {
  return submissions
    .map((submission) => ({ submission, state: stateOf(submission) }))
    .sort(
      (a, b) =>
        ORDER[a.state] - ORDER[b.state] ||
        Number(a.submission.assignment_id) - Number(b.submission.assignment_id),
    )
    .map(({ submission, state }) => ({
      // The submission's own id, under the name the school gives it.
      id: String(submission.assignment_id),
      name:
        submission.student?.trim() || `Pupil ${submission.student_id ?? submission.assignment_id}`,
      adm: submission.regno?.trim() || BLANK,
      // Already formatted by the school, and in its own style — read back onto
      // the one every other date on these pages is shown in. `when` hands back
      // whatever it was sent if it will not parse, so nothing is invented.
      submitted: when(submission.submitted, true),
      score: submission.total_score == null ? BLANK : String(submission.total_score),
      state,
    }))
}

export function isTheory(answer: MarkingAnswer): boolean {
  return answer.question_type === 'theory'
}

/**
 * How one answer is named when its mark is sent back.
 *
 * The answer's own id, not the question's — the school's example marks
 * `{"305": 8}`, and every answer carries an `answer_id` of that shape.
 */
export function answerKey(answer: MarkingAnswer): string {
  return String(answer.answer_id)
}

/** What the pupil picked, in words. Empty where they answered nothing. */
export function chosenOption(answer: MarkingAnswer): string {
  return answer.options?.find((option) => option.chosen)?.option_text?.trim() ?? ''
}

/** What the assignment says is right. */
export function correctOption(answer: MarkingAnswer): string {
  return answer.options?.find((option) => option.is_correct)?.option_text?.trim() ?? ''
}

/**
 * Whether the pupil picked the right option, where the answer has one to pick.
 * Null on a theory answer and on one nobody answered — neither is a wrong
 * answer, and showing them as one would be marking a pupil down for the shape
 * of the question.
 */
export function wasRight(answer: MarkingAnswer): boolean | null {
  if (isTheory(answer)) return null
  const chosen = answer.options?.find((option) => option.chosen)
  return chosen ? Boolean(chosen.is_correct) : null
}

/** What the sheet opens on for one answer: the mark given, or the one proposed. */
export function openingScore(answer: MarkingAnswer): string {
  if (answer.score != null) return String(answer.score)
  // A theory answer is nobody's to propose. A multiple-choice one has a right
  // answer the school already told us, so the sheet fills the mark in and the
  // teacher overrules it or leaves it.
  const right = wasRight(answer)
  if (right === null) return ''
  return right ? String(answer.points ?? 0) : '0'
}

export function openingScores(answers: MarkingAnswer[]): Record<string, string> {
  const scores: Record<string, string> = {}
  for (const answer of answers) scores[answerKey(answer)] = openingScore(answer)
  return scores
}

/** The answers a teacher has to read rather than confirm. */
export function needsHand(answers: MarkingAnswer[]): MarkingAnswer[] {
  return answers.filter(isTheory)
}

/** How many of the multiple-choice answers match the key. */
export function rightCount(answers: MarkingAnswer[]): number {
  return answers.filter((answer) => wasRight(answer) === true).length
}

/** How many of them there were to get right. */
export function choiceCount(answers: MarkingAnswer[]): number {
  return answers.filter((answer) => !isTheory(answer)).length
}

/** What the whole assignment was worth. */
export function maxTotal(answers: MarkingAnswer[]): number {
  return answers.reduce((sum, answer) => sum + (answer.points ?? 0), 0)
}

/** A mark as it is being typed: blank counts as nothing given yet, not zero. */
function figure(value: string | undefined): number | null {
  const digits = (value ?? '').replace(/[^0-9]/g, '')
  return digits ? Number(digits) : null
}

/** What the submission stands at while the sheet is being filled in. */
export function runningTotal(
  answers: MarkingAnswer[],
  scores: Record<string, string>,
): number {
  return answers.reduce(
    (sum, answer) => sum + (figure(scores[answerKey(answer)]) ?? 0),
    0,
  )
}

/**
 * What the sheet sends: a mark for every answer.
 *
 * Every one of them, not the written ones alone — this school scores nothing
 * itself, so an answer left out of `scores` is an answer left unmarked. A box
 * the teacher emptied is nought given, which is a decision they took by
 * pressing save. `regrade` goes only on a submission already marked.
 */
export function gradeBody({
  answers,
  scores,
  comment,
  marked,
}: {
  answers: MarkingAnswer[]
  scores: Record<string, string>
  comment: string
  marked: boolean
}): GradeBody {
  const given: Record<string, number> = {}
  for (const answer of answers) {
    const key = answerKey(answer)
    given[key] = figure(scores[key]) ?? 0
  }

  return {
    scores: given,
    ...(comment.trim() ? { comment: comment.trim() } : {}),
    ...(marked ? { regrade: true } : {}),
  }
}
