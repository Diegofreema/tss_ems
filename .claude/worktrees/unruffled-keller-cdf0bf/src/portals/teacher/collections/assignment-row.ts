import type { Assignment } from '../../../api/set-assignments/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'
import { schoolMillis, schoolTime, when } from '../../../features/collections/when.ts'

/**
 * The teacher's own register of assignments, off `GET /setassignments`.
 *
 * Unlike the pupil's list, nothing here has been worked out by the server:
 * there is no `window_problem` on a set assignment, because the question the server
 * answers for a pupil — may I sit this? — is not the question a teacher is
 * asking. What a teacher wants to know is whether the assignment is finished, and
 * the only thing that says so is whether it holds any questions at all.
 */

export type AssignmentState =
  | 'No questions'
  | 'Open'
  | 'Not open yet'
  | 'Closed'
  | 'Inactive'

/**
 * Which state an assignment is in, from the teacher's side.
 *
 * Order matters. An assignment the school has taken out of use is inactive whatever
 * its dates say; one whose window has been and gone is over whether or not it
 * was ever written; and of the assignments still to come, the empty ones are the
 * outstanding job, so they say so rather than saying "open".
 */
export function stateOf(assignment: Assignment, now = Date.now()): AssignmentState {
  const status = assignment.status?.trim().toLowerCase()
  if (status && status !== 'active') return 'Inactive'

  const closes = schoolMillis(assignment.closedate)
  if (closes !== null && closes <= now) return 'Closed'

  if (!assignment.total_questions) return 'No questions'

  const opens = schoolMillis(assignment.opendate)
  return opens !== null && opens > now ? 'Not open yet' : 'Open'
}

/** Unwritten assignments first — they are the work — then what is live, then what is over. */
const ORDER: Record<AssignmentState, number> = {
  'No questions': 0,
  Open: 1,
  'Not open yet': 2,
  Closed: 3,
  Inactive: 4,
}

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

export function assignmentRows(assignments: Assignment[], now = Date.now()): Row[] {
  return assignments
    .map((assignment) => ({ assignment, state: stateOf(assignment, now) }))
    .sort(
      (a, b) => ORDER[a.state] - ORDER[b.state] || Number(b.assignment.id) - Number(a.assignment.id),
    )
    .map(({ assignment, state }) => ({
      id: String(assignment.id),
      title: assignment.title?.trim() || `Assignment ${assignment.id}`,
      subject: text(assignment.subject),
      klass: text(assignment.class),
      questions: String(assignment.total_questions ?? 0),
      closes: when(schoolTime(assignment.closedate), true),
      state,

      // Read by the record panel rather than the table.
      details: text(assignment.details),
      term: text(assignment.semester),
      minutes: assignment.time_limit ? `${assignment.time_limit} minutes` : 'No limit',
      pass: assignment.passing_score == null ? BLANK : `${assignment.passing_score}%`,
      opens: when(schoolTime(assignment.opendate), true),

      // Held for the forms, which submit ids rather than the names shown, and
      // for the update body, which sends back a status this portal never sets.
      status: assignment.status ?? '',
      subject_id: assignment.subject_id == null ? '' : String(assignment.subject_id),
      department_id: assignment.department_id == null ? '' : String(assignment.department_id),
      time_limit: assignment.time_limit == null ? '' : String(assignment.time_limit),
      passing_score: assignment.passing_score == null ? '' : String(assignment.passing_score),
    }))
}

/** The three figures above the register, counted off the rows themselves. */
export function assignmentTally(rows: Row[]) {
  const count = (state: AssignmentState) => rows.filter((row) => row.state === state).length
  return {
    assignments: rows.length,
    open: count('Open'),
    unwritten: count('No questions'),
  }
}
