import { schoolCountryId } from '../../../features/collections/country-ids.ts'
import type { StudentBody } from '../../../api/students/types.ts'

/** The form's values, all strings or a Date from the calendar field. */
export type FormValues = Record<string, unknown>

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asId(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/** The API takes `YYYY-MM-DD`, which is what the calendar field's Date becomes. */
function isoDate(value: unknown): string | undefined {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return undefined
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
}

/**
 * The enrol/edit form as `POST /students` wants it.
 *
 * Fields the form left empty are dropped rather than sent blank, so editing
 * one section of a pupil never clears another. `department_id` is the only
 * number the endpoint insists on; the arm and guardian go as the strings the
 * selects hold, which is what the API accepts for them.
 *
 * Admission and enrolment are not in here: the form does not ask for them, and
 * each caller says for itself what a record it is creating starts out as.
 */
export function studentBody(values: FormValues, sessionId?: number): StudentBody {
  const department = Number(values.department_id)

  return {
    fname: text(values.fname) ?? '',
    lname: text(values.lname) ?? '',
    mname: text(values.mname),
    dob: isoDate(values.dob),
    email: text(values.email),
    gender: text(values.gender),
    phone: text(values.phone),
    address: text(values.address),
    religion: text(values.religion),
    department_id: Number.isFinite(department) && department > 0 ? department : undefined,
    class_arm_id: text(values.class_arm_id),
    sparent_id: text(values.sparent_id),
    // The form holds a country as its ISO code, which is the one thing about a
    // country that is not the school's own. The number is, and is looked up
    // here — a country the school has no id for is stored without one.
    country_id: schoolCountryId(values.country),
    state_id: asId(values.state),
    session_id: sessionId,
  }
}
