import type { AssignmentBody } from '../../../api/set-assignments/types.ts'

/**
 * What the assignment form submits.
 *
 * `test_type` is not asked for. Every assignment the API has ever sent is a
 * `cbt_test`, and it is the only kind the pupil's portal can sit — offering a
 * dropdown of one choice, or of kinds nobody has seen the school accept, would
 * be inventing a decision the teacher does not have.
 *
 * Neither is the window: `opendate` and `closedate` are in no body the API
 * documents, and the school fills the closing date in itself.
 */
const TEST_TYPE = 'cbt_test'

/** A figure the teacher left blank is null — the API's own "no limit". */
function figure(value: unknown): number | null {
  const digits = String(value ?? '').replace(/[^0-9]/g, '')
  return digits ? Number(digits) : null
}

export function assignmentBody(values: Record<string, unknown>, status?: string): AssignmentBody {
  return {
    subject_id: Number(values.subject_id),
    department_id: Number(values.department_id),
    title: String(values.title ?? '').trim(),
    details: String(values.details ?? '').trim(),
    test_type: TEST_TYPE,
    time_limit: figure(values.time_limit),
    passing_score: figure(values.passing_score),
    // Carried through on an edit rather than set: nothing in this portal
    // changes an assignment's status, and the update body sends one, so leaving it
    // out would be letting the API guess what the office had decided.
    ...(status ? { status } : {}),
  }
}
