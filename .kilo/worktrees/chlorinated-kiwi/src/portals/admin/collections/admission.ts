import type { StudentBody } from '../../../api/students/types.ts'
import type { Row } from '../../../features/collections/types.ts'

/** The two decisions the API can record. There is no third status for it. */
export const ADMIT = 'Admit'

export type ReviewValues = {
  decision?: unknown
  department_id?: unknown
  class_arm_id?: unknown
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function studentName(row: Row): string {
  return [row.fname, row.mname, row.lname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
}

/**
 * A decision on an application, as `POST /students/{id}` takes it.
 *
 * Only what the decision changes is sent — the endpoint leaves out what it is
 * not given, and a decision must not blank the details the family supplied.
 * The name goes along because the endpoint asks for it either way.
 *
 * An admitted applicant needs both statuses: `status` says the application
 * succeeded, `studentstatus` puts them on the register. A declined one gets
 * neither a class nor an enrolment, since they are joining nothing.
 */
export function admission(
  row: Row,
  values: ReviewValues,
): { body: StudentBody; message: string } {
  const admit = values.decision === ADMIT
  const department = Number(values.department_id)
  const name = studentName(row) || 'The applicant'

  return {
    body: {
      fname: row.fname ?? '',
      lname: row.lname ?? '',
      status: admit ? 'Admitted' : 'Declined',
      studentstatus: admit ? 'Active' : undefined,
      department_id:
        admit && Number.isFinite(department) && department > 0 ? department : undefined,
      class_arm_id: admit ? text(values.class_arm_id) : undefined,
    },
    message: admit ? `${name} admitted` : `${name} declined`,
  }
}
