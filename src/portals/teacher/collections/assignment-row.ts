import type { Assignment } from '../../../api/set-assignments/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'
import {
  schoolMillis,
  schoolTime,
  toDateTimeInput,
  when,
} from '../../../features/collections/when.ts'

/**
 * The teacher's own register of assignments, off `GET /setassignments`.
 *
 * Unlike the student's list, nothing here has been worked out by the server:
 * there is no `window_problem` on a set assignment, because the question the
 * server answers for a student — may I sit this? — is not the question a
 * teacher is asking. What a teacher wants to know is where the paper is in its
 * window, and how many have handed it in.
 *
 * There is no "No questions" state any more. It was read off
 * `total_questions`, which went with the rest of the quiz's fields on
 * 2026-10-02: an assignment is written work whose instructions are the task,
 * and the objective paper that needed its questions counted is a quiz now.
 */

export type AssignmentState = 'Open' | 'Not open yet' | 'Closed' | 'Inactive'

/**
 * Which state an assignment is in, from the teacher's side.
 *
 * Order matters. An assignment the school has taken out of use is inactive
 * whatever its dates say, and one whose window has been and gone is over.
 */
export function stateOf(assignment: Assignment, now = Date.now()): AssignmentState {
  const status = assignment.status?.trim().toLowerCase()
  if (status && status !== 'active') return 'Inactive'

  const closes = schoolMillis(assignment.closedate)
  if (closes !== null && closes <= now) return 'Closed'

  const opens = schoolMillis(assignment.opendate)
  return opens !== null && opens > now ? 'Not open yet' : 'Open'
}

/** What is live first — it is what pupils are handing in — then what is coming, then what is over. */
const ORDER: Record<AssignmentState, number> = {
  Open: 0,
  'Not open yet': 1,
  Closed: 2,
  Inactive: 3,
}

/**
 * Who the paper is for. The school says `for_every_arm` beside the id; the
 * arm's name is not sent, and an arm is chosen from the teacher's own form, so
 * the register says which kind rather than inventing a name.
 */
function arms(assignment: Assignment): string {
  if (assignment.for_every_arm ?? assignment.class_arm_id == null) return 'Every arm'
  return 'One arm'
}

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/**
 * The fields the school will still take on this paper.
 *
 * A paper nobody has sat takes everything. Once a pupil has handed one in the
 * school locks it and names what is left — `["status", "closedate"]` on every
 * paper read so far — because the answers already filed are the record of
 * what those pupils were asked, and rewriting the question under a marked
 * answer rewrites history.
 *
 * Read off the row rather than decided here. A school that widens the list
 * widens the form with it, and a deployment that sends no list at all locks
 * nothing, because a form must never be shut on a question the school was
 * never asked — the same rule the default-password gate follows.
 */
export function editableFields(assignment: Assignment): string[] | null {
  if (!assignment.locked) return null
  return assignment.editable_when_locked ?? null
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
      arms: arms(assignment),
      closes: when(schoolTime(assignment.closedate), true),
      state,

      // Read by the record panel rather than the table.
      details: text(assignment.details),
      term: text(assignment.semester),
      opens: when(schoolTime(assignment.opendate), true),

      // The window as the school wrote it, beside the two display strings
      // above. The form opens on these: "23 Sep 2026, 08:12" is for reading
      // and parses to nothing, so a form fed the display value would open
      // empty and save the window away on the first correction.
      opens_at: toDateTimeInput(assignment.opendate),
      closes_at: toDateTimeInput(assignment.closedate),

      // What the school will still take, and why it will not take the rest.
      // Empty where the paper is open to everything.
      locked: assignment.locked ? 'yes' : '',
      locked_reason: text(assignment.locked_reason),
      editable_when_locked: (editableFields(assignment) ?? []).join(','),
      sat_by: String(assignment.submission_count ?? 0),

      // Held for the forms, which submit ids rather than the names shown, and
      // for the update body, which sends back a status this portal never sets.
      status: assignment.status ?? '',
      subject_id: assignment.subject_id == null ? '' : String(assignment.subject_id),
      department_id: assignment.department_id == null ? '' : String(assignment.department_id),
      class_arm_id: assignment.class_arm_id == null ? '' : String(assignment.class_arm_id),
    }))
}

/** The three figures above the register, counted off the rows themselves. */
export function assignmentTally(rows: Row[]) {
  const count = (state: AssignmentState) => rows.filter((row) => row.state === state).length
  return {
    assignments: rows.length,
    open: count('Open'),
    handedIn: rows.reduce((sum, row) => sum + (Number(row.sat_by) || 0), 0),
  }
}
