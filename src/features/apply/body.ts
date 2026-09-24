// Relative imports only, so `node --test` can load this — see CLAUDE.md.
import type { ApplicationBody } from '../../api/students/types.ts'
import type { ApiFieldErrors } from '../../api/types.ts'
import { isoDate } from '../collections/birthday.ts'
import { schoolCountryId, STATES_KNOWN_FOR } from '../collections/country-ids.ts'
import type { ApplicationValues } from './schema.ts'

/**
 * The form's values as `POST /students/apply` names them.
 *
 * An optional box left empty goes as `""`, which is how the endpoint's own
 * sample sends an absent email and class — unlike the office's enrolment
 * form, this body is new with every submission, so there is nothing on file
 * for an absent key to have preserved.
 *
 * The country follows from the state, as it does on the teacher form: the
 * only states this school can number are Nigeria's (`country-ids.ts`), so a
 * state chosen at all is a Nigerian one. No state, no country — an address
 * reading "Nigeria" and nothing else is the form inventing a fact.
 */
export function applicationBody(values: ApplicationValues): ApplicationBody {
  const state = Number(values.state_id)
  const hasState = Number.isInteger(state) && state > 0

  return {
    fname: values.fname.trim(),
    lname: values.lname.trim(),
    mname: values.mname.trim(),
    dob: isoDate(values.dob) ?? '',
    gender: values.gender,
    address: values.address.trim(),
    phone: values.phone.trim(),
    // The office chooses the class when it admits the child from Applicants.
    department_id: '',
    ...(hasState ? { state_id: state, country_id: schoolCountryId(STATES_KNOWN_FOR) } : {}),
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
