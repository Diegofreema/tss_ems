import type { Assignment } from '../../../../api/assignments/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { schoolMillis, schoolTime, when } from '../../../../features/collections/when.ts'
import { text } from '../../../../features/profile/record.ts'

/**
 * The pupil's own list of assignments, off `GET /assignments`.
 *
 * The endpoint has already worked out whether an assignment can be sat — that is
 * what `window_problem` is — so nothing here second-guesses it. The dates are
 * only read to tell the two shut states apart: an assignment that has closed and an
 * assignment that has not opened both come back refused, and a pupil who reads
 * "Missed" against an assignment that starts on Monday has been told the opposite of
 * the truth.
 */

export type AssignmentState = 'Open' | 'Submitted' | 'Missed' | 'Not open yet'

/**
 * Which of the four states an assignment is in for this pupil.
 *
 * `now` is passed in rather than read, so the boundary between "not open yet"
 * and "missed" can be tested rather than waited for.
 */
export function stateOf(assignment: Assignment, now = Date.now()): AssignmentState {
  if (assignment.submitted) return 'Submitted'
  if (!assignment.window_problem) return 'Open'

  // Shut, and the two reasons read as opposites. The opening time decides it;
  // where the school sent none, a shut assignment is one that has been and gone.
  const opens = schoolMillis(assignment.opendate)
  return opens !== null && opens > now ? 'Not open yet' : 'Missed'
}

/** Open first, then what is still to come, then what is over — newest last. */
const ORDER: Record<AssignmentState, number> = {
  Open: 0,
  'Not open yet': 1,
  Submitted: 2,
  Missed: 2,
}

/**
 * How many questions the assignment actually holds.
 *
 * `total_questions` is what the teacher meant to write and `question_count` is
 * what they wrote — assignment 6 says 4 and 1. A pupil is told the second: an assignment
 * promising four questions and holding one reads as three that failed to load.
 */
export function questionCount(assignment: Assignment): number | null {
  return assignment.question_count ?? null
}

/** How long is allowed once started, where the assignment sets a limit at all. */
function limit(assignment: Assignment): string {
  const minutes = assignment.time_limit
  return minutes ? `${minutes}` : 'No limit'
}

export function assignmentRows(assignments: Assignment[], now = Date.now()): Row[] {
  return assignments
    .map((assignment) => ({ assignment, state: stateOf(assignment, now) }))
    .sort(
      (a, b) =>
        ORDER[a.state] - ORDER[b.state] || Number(b.assignment.id) - Number(a.assignment.id),
    )
    .map(({ assignment, state }) => ({
      id: String(assignment.id),
      title: assignment.title?.trim() || `Assignment ${assignment.id}`,
      subject: text(assignment.subject),
      questions: questionCount(assignment)?.toString() ?? BLANK,
      minutes: limit(assignment),
      closes: when(schoolTime(assignment.closedate), true),
      state,

      // Read by the assignment's own page rather than the table.
      details: text(assignment.details),
      klass: text(assignment.class),
      opens: when(schoolTime(assignment.opendate), true),
      pass: assignment.passing_score == null ? BLANK : `${assignment.passing_score}%`,
      // The school's own sentence for why it cannot be sat, kept word for word
      // so a pupil quoting it to the office is quoting the office back.
      why: text(assignment.window_problem),
    }))
}

/** The three figures above the list, counted off the rows themselves. */
export function assignmentTally(rows: Row[]) {
  const count = (state: AssignmentState) => rows.filter((row) => row.state === state).length
  return {
    open: count('Open'),
    submitted: count('Submitted'),
    missed: count('Missed'),
  }
}
