import type { ListParams, Row } from '../../../features/collections/types.ts'

/**
 * The office's dropdowns, applied to rows rather than sent to the endpoint.
 *
 * A register read off the device narrows itself, and it can only do that where
 * the thing being narrowed by is actually on the row. Both of these are: an arm
 * and a subject each carry the class they belong to as `department_id`, kept
 * beside the class's *name* because the form is keyed as the endpoint is.
 *
 * Compared as text on purpose. A filter's value comes off the URL, so it is a
 * string whatever the row spells it as, and `'2' === 2` is false.
 */
export function byClassAndStatus(
  rows: Row[],
  filters: ListParams['filters'],
): Row[] {
  const klass = filters.department_id?.trim()
  const status = filters.status?.trim()

  return rows.filter((row) => {
    if (klass && String(row.department_id ?? '') !== klass) return false
    // The status a row shows is the word the register prints — "Active",
    // "Archived" — and the options offer exactly those words, so they are
    // compared as they are rather than translated back into what the endpoint
    // would have taken.
    if (status && row.status !== status) return false
    return true
  })
}

/** The word the fee register prints for a fee still being charged. */
export const FEE_CHARGED = 'Active'

/**
 * The fee catalogue's own dropdowns.
 *
 * Its filters do not speak the words its rows print, unlike the arms and the
 * subjects: `status` comes through as the `1` or `0` the endpoint takes, and
 * the charge is the raw `feetype` the endpoint keys on rather than the phrase
 * the column shows. So both are translated here — and the row carries the raw
 * `feetype` beside the phrase precisely so this does not have to match on
 * words that a change of copy would break.
 */
export function byStatusAndCharge(
  rows: Row[],
  filters: ListParams['filters'],
): Row[] {
  const status = filters.status?.trim()
  const charge = filters.feetype?.trim()

  return rows.filter((row) => {
    const charged = row.status === FEE_CHARGED
    if (status === '1' && !charged) return false
    if (status === '0' && charged) return false
    if (charge && row.feetype !== charge) return false
    return true
  })
}

/**
 * The student register's four dropdowns.
 *
 * Class and arm are ids the row already carries for its edit form. The other
 * two are the school's two different words for a student's standing, and the
 * column merges them — `status` shows whichever says the most — so the filters
 * read the unmerged pair beside it instead: `admission` is where the student is
 * in admission, `studentstatus` is whether they are active or suspended.
 */
export function byClassArmAndStanding(
  rows: Row[],
  filters: ListParams['filters'],
): Row[] {
  const klass = filters.department_id?.trim()
  const arm = filters.class_arm_id?.trim()
  const admission = filters.status?.trim()
  const enrolment = filters.studentstatus?.trim()

  return rows.filter((row) => {
    if (klass && String(row.department_id ?? '') !== klass) return false
    if (arm && String(row.class_arm_id ?? '') !== arm) return false
    if (admission && row.admission !== admission) return false
    if (enrolment && row.studentstatus !== enrolment) return false
    return true
  })
}

/**
 * The staff page's one dropdown, which swaps the register rather than narrowing
 * it: the teaching records and the office ones are two endpoints behind one
 * page, held in one set and told apart by the kind their key carries.
 *
 * Unset means the teaching staff — much the larger of the two — which is what
 * the filter's own label says.
 */
export function byStaffKind(
  rows: Row[],
  filters: ListParams['filters'],
  administrators: string,
  /**
   * How a row says which register it came from. Passed in rather than matched
   * on a prefix here: the key's shape belongs to `staff-row.ts`, and a copy of
   * it in this file is a copy that can go out of step — which it did, and a
   * test written against the copy agreed with it. The whole row rather than
   * the id, because a row this device queued is keyed `local:` and answers
   * with its own words instead.
   */
  kindOf: (row: Row) => 'teacher' | 'admin',
): Row[] {
  const office = filters.role?.trim() === administrators
  return rows.filter((row) => (kindOf(row) === 'admin') === office)
}
