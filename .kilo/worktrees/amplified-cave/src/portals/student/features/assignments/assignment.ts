import type {
  AssignmentDetail,
  Question,
  SubmitAssignmentBody,
} from '../../../../api/assignments/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import { schoolMillis, schoolTime, when } from '../../../../features/collections/when.ts'
import { hasText } from '../../../../features/collections/rich-text.ts'
import { text } from '../../../../features/profile/record.ts'

/**
 * An assignment being sat: what the student has answered so far, and what is sent back
 * when they finish.
 *
 * Answers are held by question id rather than by position, because that is
 * what the endpoint takes and because an assignment renumbered between two renders
 * would otherwise move every answer one question along.
 */

/** Question id to answer: an option id, or the text of a theory answer. */
export type Draft = Record<number, number | string>

export function questionsOf(assignment: AssignmentDetail | undefined): Question[] {
  return assignment?.questions ?? []
}

export function isTheory(question: Question): boolean {
  return question.question_type === 'theory' || !(question.options?.length)
}

/**
 * Whether this question has been answered. Whitespace typed into a theory box
 * is not an answer — it would be sent, stored and marked as one.
 *
 * `hasText` rather than a trim, because the theory box is the editor: a
 * student who typed a sentence and deleted it leaves `<p></p>` behind, which
 * is a non-empty string and would have counted on the progress line, passed
 * the "you have not answered everything" check, and been filed as an answer.
 */
export function isAnswered(draft: Draft, question: Question): boolean {
  const answer = draft[question.id]
  if (typeof answer === 'string') return hasText(answer)
  return answer !== undefined
}

export function answeredCount(draft: Draft, questions: Question[]): number {
  return questions.filter((question) => isAnswered(draft, question)).length
}

/**
 * When the assignment was opened, in the school's own clock and with no zone on it.
 *
 * The API ignores the offset it is sent and keeps the wall clock: a submit
 * carrying `10:00:00Z` is stored as `10:00:00+01:00`. Sending a zone would
 * therefore be sending something that is quietly discarded, and sending the
 * reader's UTC would put the attempt an hour out for anyone abroad. The wall
 * clock, unqualified, is the one thing the school and the student agree on.
 */
export function startedAt(at: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return (
    `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` +
    `T${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`
  )
}

/**
 * What is posted to `/assignments/{id}/submit`.
 *
 * Unanswered questions are left out rather than sent empty: the API marks a
 * missing answer zero either way, and an empty string filed against a theory
 * question is an answer a teacher then has to read and score.
 */
export function submitBody(
  draft: Draft,
  questions: Question[],
  openedAt: Date,
): SubmitAssignmentBody {
  const answers: Record<string, number | string> = {}
  for (const question of questions) {
    if (!isAnswered(draft, question)) continue
    const answer = draft[question.id]
    answers[String(question.id)] = typeof answer === 'string' ? answer.trim() : answer
  }
  return { answers, actual_start_time: startedAt(openedAt) }
}

/** How long the student has, in seconds, where the assignment sets a limit at all. */
export function limitSeconds(assignment: AssignmentDetail | undefined): number | null {
  const minutes = assignment?.assignment?.time_limit
  return minutes ? minutes * 60 : null
}

/**
 * Why the assignment cannot be sat, if it cannot.
 *
 * The detail route sends `window_problem` as a sibling of `assignment` and
 * nulls the copy inside it, so the sibling is the one to believe.
 */
export function windowProblem(assignment: AssignmentDetail | undefined): string | undefined {
  return assignment?.window_problem?.trim() || undefined
}

/** The line under an assignment's title: subject, class, and how much of it there is. */
export function assignmentMeta(detail: AssignmentDetail | undefined): string {
  const assignment = detail?.assignment
  const questions = questionsOf(detail).length
  return [
    assignment?.subject?.trim(),
    assignment?.class?.trim(),
    `${questions} question${questions === 1 ? '' : 's'}`,
    assignment?.time_limit ? `${assignment.time_limit} minutes` : 'no time limit',
    'one attempt',
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * The assignment's terms, as the student is shown them before starting.
 *
 * `question_count` is null on this route whatever the list said, so the
 * count is the questions actually sent.
 */
export function assignmentFields(
  detail: AssignmentDetail | undefined,
): { label: string; value: string }[] {
  const assignment = detail?.assignment
  return [
    { label: 'Subject', value: text(assignment?.subject) },
    { label: 'Set for', value: text(assignment?.class) },
    { label: 'Questions', value: String(questionsOf(detail).length) },
    {
      label: 'Time allowed',
      value: assignment?.time_limit ? `${assignment.time_limit} minutes` : 'No limit',
    },
    { label: 'Opens', value: when(schoolTime(assignment?.opendate), true) },
    { label: 'Closes', value: when(schoolTime(assignment?.closedate), true) },
    {
      label: 'Pass mark',
      value: assignment?.passing_score == null ? BLANK : `${assignment.passing_score}%`,
    },
  ]
}

/** A span of minutes as somebody would say it out loud. */
function spell(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const said = `${hours} hour${hours === 1 ? '' : 's'}`
  return rest ? `${said} and ${rest} minute${rest === 1 ? '' : 's'}` : said
}

/**
 * What the closing time means for somebody about to press Start, beyond the
 * two dates already listed above it.
 *
 * **The window cuts the clock short, and nothing said so.** `attemptExpiry`
 * takes the earlier of "the time allowed" and "when the assignment shuts", so a
 * student starting a thirty-minute paper ten minutes before it closes gets
 * ten — while the terms above them still read "Time allowed: 30 minutes".
 * That is the app telling them something untrue at the one moment it matters,
 * and they find out when the clock runs out two thirds of the way through.
 *
 * Null when there is nothing worth saying: no closing time, one already past
 * (the school refuses the sitting and says so itself), or a window wide enough
 * that the time allowed is the real bound.
 */
export function windowNote(
  detail: AssignmentDetail | undefined,
  now: number,
): string | null {
  const assignment = detail?.assignment
  const closes = schoolMillis(assignment?.closedate)
  if (closes === null) return null

  const left = Math.floor((closes - now) / 60_000)
  // Already shut, or shutting inside the minute. Either way the school's own
  // refusal is the thing to show, not a countdown.
  if (left <= 0) return null

  const limit = assignment?.time_limit ?? null
  if (limit && left < limit) {
    return `This assignment shuts in ${spell(left)}, which is less than the ${limit} minutes it allows. The clock stops when it shuts, so starting now gives you about ${spell(left)}, not ${limit}.`
  }

  // Worth saying without a limit too: an assignment with no time limit is
  // bounded by its window and nothing else, so the window *is* the clock.
  if (!limit) return `This assignment shuts in ${spell(left)}. There is no other time limit, so that is how long you have.`

  return null
}
