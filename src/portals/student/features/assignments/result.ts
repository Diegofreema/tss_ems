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
 * choice **is** scored by the server the moment the assignment is submitted,
 * which is where `percentage` comes from; the theory is scored by a teacher,
 * and `is_graded` is about that. An assignment can therefore carry a real
 * percentage and still be waiting on somebody, and one with no percentage at
 * all is not a student who scored nothing.
 *
 * Read off bronze 2026-09-16 and worth writing down, because the teacher's
 * half of the API says the opposite and both are true of their own endpoint.
 * Paper 90 — four questions, every one multiple choice, one submission, no
 * teacher near it:
 *
 *   this route      score: { total_score: 1, max_points: 8, percentage: 12.5 },
 *                   is_graded: false
 *   marking view    every answer `score: null`, `total_score: null`,
 *                   `graded_at: null`
 *
 * So `marking.ts`'s "the school scores nothing itself" is a fact about the
 * **marking** endpoint, not about the school — which is why the sheet works
 * every mark out from the answer key before showing it. The student's own
 * result was scored all along. Anything built on "the student is waiting for a
 * teacher to press Save before they see a mark" is built on a misreading of
 * those two comments together; they do not contradict each other.
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

/**
 * Whether this paper is certainly finished — nothing on it a teacher could
 * still add to.
 *
 * Deliberately hard to satisfy, because the two mistakes are not equal. Saying
 * "this can go up" about a mark that cannot is a small confusion; saying
 * nothing about a mark that *can* lets a student read 40% as final when a
 * teacher still has their essays to read. So certainty is required to go
 * quiet, and anything less keeps the sentence.
 *
 * Two conditions, and the second is the one that is easy to miss: every
 * question has to be accounted for. This route has been seen sending fewer
 * answers than `total_questions` — 2 against a stated 4 — so "none of the
 * answers I can see is written" is not the same claim as "nothing on this
 * paper is written", and only the second one licenses silence.
 */
function certainlyFinal(result: AssignmentResult | undefined): boolean {
  const answers = result?.answers ?? []
  if (answers.length === 0) return false

  const questions = Number(result?.score?.total_questions ?? 0)
  if (!questions || answers.length < questions) return false

  return !answers.some(
    (answer) => answer.question_type === 'theory' || answer.theory_answer != null,
  )
}

/**
 * The sentence under it, saying what the figure does and does not cover.
 *
 * "This can go up" is only true where something is still with a teacher. On a
 * paper of nothing but multiple choice the figure is final the moment it is
 * submitted — the server scores the choices itself — so promising a student
 * their 12.5% might improve is holding out a hope the paper cannot deliver.
 * `is_graded` alone could not tell the two apart: it is false on a finished
 * all-choice paper exactly as it is on one waiting to be read.
 */
export function scoreNote(result: AssignmentResult | undefined): string {
  const score = result?.score
  if (!isScored(result)) {
    return 'Your teacher has not marked this assignment. Nothing has been scored against you — a mark appears here once it has been.'
  }
  const graded = result?.assignment?.is_graded
  const counted = `${mark(score?.total_score)} of ${mark(score?.max_points)} marks, from ${mark(score?.correct_answers)} of ${mark(score?.total_questions)} questions.`
  if (graded || certainlyFinal(result)) return counted
  return `${counted} Anything written out is still with your teacher, so this can go up.`
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
    /*
     * Who marked it, and the answer is not always a person.
     *
     * `is_graded` means "something has been filed", not "a teacher read it" —
     * and on a paper of nothing but multiple choice nobody ever reads it: the
     * server scores the choices at submit, and the teacher's portal files the
     * same figures off the answer key without anybody opening the script. A
     * flat "Marked by a teacher: Yes" on that paper is the app telling a
     * student something untrue about their own work.
     *
     * So the row answers the question the paper actually raises. Where there
     * is writing on it, a person is the one who decides and the row says
     * whether they have; where there is not, it names the answer key, which is
     * both true and the more useful thing to know.
     */
    certainlyFinal(result)
      ? { label: 'Marked', value: 'From the answer key' }
      : { label: 'Marked by a teacher', value: assignment?.is_graded ? 'Yes' : 'Not yet' },
    { label: "Teacher's note", value: text(assignment?.teacher_comments) },
  ]
}

/**
 * What the student chose, in words.
 *
 * The result carries the option's id and not its text, so the assignment is read
 * for the wording — the same call the page already makes to find the
 * submission. An id on its own tells a student nothing about what they picked.
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
