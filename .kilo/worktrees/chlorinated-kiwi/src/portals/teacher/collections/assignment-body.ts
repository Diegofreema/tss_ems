import type { AssignmentBody } from '../../../api/set-assignments/types.ts'
import { toSchoolStamp } from '../../../features/collections/when.ts'

/**
 * What the assignment form submits.
 *
 * `test_type` is not asked for. Every assignment the API has ever sent is a
 * `cbt_test`, and it is the only kind the student's portal can sit — offering a
 * dropdown of one choice, or of kinds nobody has seen the school accept, would
 * be inventing a decision the teacher does not have.
 *
 * The window **is** asked for now. It was not: the API took neither date and
 * the school filled the closing time in itself, which is why every paper on
 * file carries an `opendate` of null and a `closedate` nobody chose. Both go
 * as `YYYY-MM-DD HH:MM:SS` with no zone — see `toSchoolStamp` — and a box left
 * empty goes as null, which is the school's own "no bound" rather than a
 * window that shuts immediately.
 */
const TEST_TYPE = 'cbt_test'

/** A figure the teacher left blank is null — the API's own "no limit". */
function figure(value: unknown): number | null {
  const digits = String(value ?? '').replace(/[^0-9]/g, '')
  return digits ? Number(digits) : null
}

/**
 * The whole body, as a paper nobody has sat takes it.
 *
 * Kept separate from what is actually sent so `assignmentBody` can narrow it:
 * the fields are decided in one place whether or not the paper is locked, and
 * a field added here cannot be forgotten there.
 */
function wholeBody(values: Record<string, unknown>, status?: string): AssignmentBody {
  return {
    subject_id: Number(values.subject_id),
    department_id: Number(values.department_id),
    title: String(values.title ?? '').trim(),
    details: String(values.details ?? '').trim(),
    test_type: TEST_TYPE,
    time_limit: figure(values.time_limit),
    passing_score: figure(values.passing_score),
    opendate: toSchoolStamp(String(values.opens_at ?? '')),
    closedate: toSchoolStamp(String(values.closes_at ?? '')),
    // Carried through on an edit rather than set: nothing in this portal
    // changes an assignment's status, and the update body sends one, so leaving it
    // out would be letting the API guess what the office had decided.
    ...(status ? { status } : {}),
  }
}

/** Which body key each field the school names in `editable_when_locked` is. */
const UNDER: Record<string, (keyof AssignmentBody)[]> = {
  status: ['status'],
  closedate: ['closedate'],
  opendate: ['opendate'],
  title: ['title'],
  details: ['details'],
  time_limit: ['time_limit'],
  passing_score: ['passing_score'],
  subject_id: ['subject_id'],
  department_id: ['department_id'],
}

export function assignmentBody(
  values: Record<string, unknown>,
  status?: string,
  /**
   * The fields the school will still take, where it has locked the paper —
   * `editableFields` in `assignment-row.ts`. Null or undefined means it will
   * take everything, which is the case for a create and for any paper nobody
   * has sat.
   */
  editable?: readonly string[] | null,
): AssignmentBody {
  const whole = wholeBody(values, status)
  if (!editable) return whole

  /*
   * A locked paper is sent only what it will take.
   *
   * The whole body would be refused — the school is protecting answers already
   * filed against the questions that produced them — and refused *wholesale*,
   * so a teacher extending a deadline on a paper their class had started would
   * have been told no for changing a title they had not touched. Narrowing it
   * here is what makes the one thing they are allowed to do actually work.
   *
   * `subject_id` and `department_id` are sent regardless: they are required on
   * the body, and they carry the paper's own values, so they say nothing new.
   */
  const narrowed: AssignmentBody = {
    subject_id: whole.subject_id,
    department_id: whole.department_id,
    title: whole.title,
    test_type: TEST_TYPE,
  }
  for (const field of editable) {
    for (const key of UNDER[field] ?? []) {
      ;(narrowed as Record<string, unknown>)[key] = whole[key]
    }
  }
  return narrowed
}
