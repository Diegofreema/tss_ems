// Relative imports only, so `node --test` can load this — see CLAUDE.md.
import type { ApplicationBody } from '../../api/students/types.ts'
import type { ApiFieldErrors } from '../../api/types.ts'
import { isoDate } from '../collections/birthday.ts'
import type { ApplicationValues } from './schema.ts'

/**
 * The form's values as `POST /students/apply` names them.
 *
 * An optional box left empty goes as `""`, which is how the endpoint's own
 * sample sends an absent email — unlike the office's enrolment
 * form, this body is new with every submission, so there is nothing on file
 * for an absent key to have preserved.
 *
 * The place ids are the school's own, chosen off its public lists, so they go
 * as the numbers they are. The LGA is the one optional reference: an empty
 * box is `null`, which the backend's nullable `lga_id` takes, rather than
 * `""`, which is not an id of anything.
 */
export function applicationBody(values: ApplicationValues): ApplicationBody {
  return {
    fname: values.fname.trim(),
    lname: values.lname.trim(),
    mname: values.mname.trim(),
    dob: isoDate(values.dob) ?? '',
    gender: values.gender,
    address: values.address.trim(),
    phone: values.phone.trim(),
    department_id: Number(values.department_id),
    country_id: Number(values.country_id),
    state_id: Number(values.state_id),
    lga_id: values.lga_id ? Number(values.lga_id) : null,
    pschools: values.pschools.trim(),
    religion: values.religion,
    email: values.email.trim(),
    fathersname: values.fathersname.trim(),
    mothersname: values.mothersname.trim(),
    fatherphone: values.fatherphone.trim(),
    motherphone: values.motherphone.trim(),
    fathersjob: values.fathersjob.trim(),
    mothersjob: values.mothersjob.trim(),
    pemailaddress: values.pemailaddress.trim(),
  }
}

/**
 * The school's own sentence for each field it refused, keyed by the field.
 * The API nests them under a rule — `{email: {_isUnique: "…"}}` — and a person
 * needs the sentence, not the rule; the first one is enough to act on.
 */
export function refusedFields(errors: ApiFieldErrors | undefined): Record<string, string> {
  const refused: Record<string, string> = {}
  for (const [field, rules] of Object.entries(errors ?? {})) {
    const first = Object.values(rules ?? {}).find((sentence) => typeof sentence === 'string')
    if (first) refused[field] = first
  }
  return refused
}
