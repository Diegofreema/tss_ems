import type {
  AssignmentResult,
  Question,
  ResultAnswer,
} from '../../../../api/assignments/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import { mark } from '../../../../features/collections/mark.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { schoolTime, when } from '../../../../features/collections/when.ts'
import { text } from '../../../../features/profile/record.ts'

/**
 * A marked attempt, off `GET /assignments/results/{submissionId}`.
 *
 * Two things are marked here and they are not the same thing. The multiple
 * choice is scored by the server the moment the assignment is submitted, which is
 * where `percentage` comes from; the theory is scored by a teacher, and
 * `is_graded` is about that. An assignment can therefore carry a real percentage and
 * still be waiting on somebody, and one with no percentage at all is not a
 * pupil who scored nothing.
 */

/** Whether the server has anything to report yet — see `max_points`. */
export function isScored(result: AssignmentResult | undefined): boolean {
  return Number(result?.score?.max_points ?? 0) > 0
}

/** The big figure. Nothing scored is said in words, never as "0%". */
export function scoreHeadline(result: AssignmentResult | undefined): string {
  if (!isScored(result)) return 'Not marked yet'
  return `${mark(result?.score?.percentage)}%`
}

/** The sentence under it, saying what the figure does and does not cover. */
export function scoreNote(result: AssignmentResult | undefined): string {
  const score = result?.score
  if (!isScored(result)) {
    return 'Your teacher has not marked this assignment. Nothing has been scored against you — a mark appears here once it has been.'
  }
  const graded = result?.assignment?.is_graded
  const counted = `${mark(score?.total_score)} of ${mark(score?.max_points)} marks, from ${mark(score?.correct_answers)} of ${mark(score?.total_questions)} questions.`
  return graded
    ? counted
    : `${counted} Anything written out is still with your teacher, so this can go up.`
}

/** The slip beside the score: when it was sat, and what the teacher said. */
export function resultFields(
  result: AssignmentResult | undefined,
): { label: string; value: string }[] {
  const assignment = result?.assignment
  return [
    { label: 'Assignment', value: text(assignment?.title) },
    { label: 'Subject', value: text(assignment?.subject) },
    { label: 'Started', value: when(schoolTime(assignment?.start_time), true) },
    { label: 'Submitted', value: when(schoolTime(assignment?.end_time), true) },
    { label: 'Took', value: text(assignment?.duration) },
    { label: 'Marked by a teacher', value: assignment?.is_graded ? 'Yes' : 'Not yet' },
    { label: "Teacher's note", value: text(assignment?.teacher_comments) },
  ]
}

/**
 * What the pupil chose, in words.
 *
 * The result carries the option's id and not its text, so the assignment is read
 * for the wording — the same call the page already makes to find the
 * submission. An id on its own tells a pupil nothing about what they picked.
 */
function chosen(answer: ResultAnswer, questions: Question[]): string {
  if (answer.theory_answer?.trim()) return answer.theory_answer.trim()
  if (answer.selected_option_id == null) return 'Left blank'

  const options = questions.find((one) => one.id === answer.question_id)?.options ?? []
  const picked = options.find((option) => option.id === answer.selected_option_id)
  return picked?.option_text?.trim() || `Option ${answer.selected_option_id}`
}

/**
 * How one answer came out. A theory answer nobody has read yet is "Not marked"
 * rather than wrong — `is_correct` is null on it, and null is not false.
 */
function verdict(answer: ResultAnswer): string {
  if (answer.is_correct === true) return 'Correct'
  if (answer.is_correct === false) return 'Wrong'
  return 'Not marked'
}

export function answerRows(
  result: AssignmentResult | undefined,
  questions: Question[] = [],
): Row[] {
  return (result?.answers ?? []).map((answer, index) => ({
    id: String(answer.question_id ?? index),
    number: String(index + 1),
    question: text(answer.question_text),
    answer: chosen(answer, questions),
    verdict: verdict(answer),
    worth: answer.points == null ? BLANK : `${mark(answer.points)}`,
  }))
}
