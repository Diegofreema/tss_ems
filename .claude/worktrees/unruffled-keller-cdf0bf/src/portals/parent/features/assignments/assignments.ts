import type { ChildAssignment, ChildAssignments } from '../../../../api/parents/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { schoolTime, when } from '../../../../features/collections/when.ts'
import { text } from '../../family.ts'

/** The API's word for an assignment the child has not sat yet. */
const OPEN = 'available'

/** A stamp read on the school's own clock, or null where it will not parse. */
function at(stamp: string | null): number | null {
  if (!stamp) return null
  const parsed = new Date(schoolTime(stamp) ?? '').getTime()
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Where the child stands on an assignment, as one word.
 *
 * The API's own status is used wherever it says something — 'completed' is
 * theirs and reads as theirs — with one thing worked out here: an assignment still
 * marked available whose closing time has passed. The endpoint does not
 * re-check the clock when it answers, and telling a family an assignment is
 * open when it shut yesterday is worse than saying nothing.
 */
export function assignmentState(assignment: ChildAssignment, now: Date): string {
  const status = assignment.status?.trim().toLowerCase()
  if (!status) return BLANK
  if (status !== OPEN) return status[0].toUpperCase() + status.slice(1)

  const closes = at(assignment.closedate)
  return closes !== null && closes < now.getTime() ? 'Closed' : 'Available'
}

/** One assignment, as the register draws it. Named by the assignment, not the sitting. */
export function assignmentRow(assignment: ChildAssignment, now: Date): Row {
  return {
    id: String(assignment.setassignment_id),
    title: text(assignment.title),
    subject: text(assignment.subject),
    closes: when(schoolTime(assignment.closedate), true),
    state: assignmentState(assignment, now),

    // Read by the record panel rather than the table.
    opens: when(schoolTime(assignment.opendate), true),
    limit: assignment.time_limit ? `${assignment.time_limit} minutes` : 'No limit',
  }
}

/**
 * The assignments set for one child.
 *
 * The endpoint answers for the household — every child with their own list —
 * so the page picks its child out rather than asking again per pupil. A
 * child with nothing set is not an error: their class has no assignment open.
 */
export function childAssignments(
  children: ChildAssignments[],
  childId: number,
  now: Date,
): Row[] {
  const mine = children.find((entry) => entry.student?.id === childId)
  return (mine?.assignments ?? []).map((assignment) => assignmentRow(assignment, now))
}
