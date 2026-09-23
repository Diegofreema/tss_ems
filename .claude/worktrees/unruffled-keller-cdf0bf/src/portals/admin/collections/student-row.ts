import type { Invoice } from '../../../api/invoices/types.ts'
import type { Student, StudentResult } from '../../../api/students/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import { birthday, isoBirthday } from '../../../features/collections/birthday.ts'
import { countryIso } from '../../../features/collections/country-ids.ts'
import type { Row } from '../../../features/collections/types.ts'
import { payStatus } from './invoice-row.ts'
import { formatDate, formatNaira } from '../../../lib/format.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** Joins the parts a record actually carries, e.g. "Mr O. Udoye · 0803 441 2280". */
function joined(...parts: (string | null | undefined)[]): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(' · ') || BLANK
}

/** A foreign key as a select's value. A missing or zero id is no choice at all. */
function id(value: number | null | undefined): string {
  return value ? String(value) : ''
}

/** An ISO timestamp as the design writes dates. Anything else is left alone. */
function asDate(value: string | null | undefined): string {
  if (!value) return BLANK
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : formatDate(date)
}

/**
 * Suspending is a switch, not an edit: the button offers whichever of the two
 * states the pupil is not currently in, and says so in the past tense once the
 * API has taken it.
 */
export function suspendAction(status: string): {
  label: string
  next: 'Active' | 'Suspended'
  done: string
} {
  return status === 'Suspended'
    ? { label: 'Reinstate', next: 'Active', done: 'reinstated' }
    : { label: 'Suspend', next: 'Suspended', done: 'suspended' }
}

/**
 * A pupil, as both the register and their own record read them. The list
 * endpoint expands fewer relations than the detail one, so the fields only
 * `GET /students/{id}` answers for come back blank in the table — which never
 * shows them anyway.
 *
 * `fees` stays blank throughout: whether a pupil owes is `GET /users/fees/{id}`,
 * one request per pupil, so the column waits for an endpoint that answers for
 * a page at a time.
 *
 * `guardians` names the households the school holds, keyed by id. The pupil
 * record carries `sparent_id` but no name to go with it, so without the
 * lookup the column falls back to whichever parent was typed onto the pupil.
 */
export function studentRow(
  student: Student,
  guardians?: ReadonlyMap<string, string>,
): Row {
  return {
    id: String(student.id),
    adm: text(student.regno ?? student.application_no),
    name: text([student.fname, student.mname, student.lname].filter(Boolean).join(' ')),
    arm: text(student.class_arm?.arm_name ?? student.department?.name),
    // The linked household where one is known, and otherwise whichever parent
    // was typed onto the pupil — which is all the pupil record itself holds.
    parent: text(
      guardians?.get(String(student.sparent_id)) ??
        (student.fathersname || student.mothersname),
    ),
    fees: BLANK,
    // `status` is where they are in admission — every enrolled pupil reads
    // "Admitted". `studentstatus` is the one that says Active or Suspended.
    status: text(student.studentstatus ?? student.status),

    // Everything below is read by the record panel rather than the table.
    class: text(student.department?.name),
    gender: text(student.gender),
    // Read through the same function the picker uses, so a pupil the office
    // enrolled here is shown "10 Nov 1986" like every other record rather than
    // the raw YYYY-MM-DD this form stored them as.
    born: birthday(student.dob),
    religion: text(student.religion),
    email: text(student.email),
    phone: text(student.phone),
    address: text(student.address),
    origin: joined(student.community, student.state?.name, student.country?.name),
    school: text(student.previousschool),
    father: joined(student.fathersname, student.fatherphone),
    mother: joined(student.mothersname, student.motherphone),
    admitted: text(student.admissiondate),

    // The edit form is keyed as the endpoint is, and prefills from here. Ids
    // are blank rather than "0" where the school has not set one, so a select
    // opens empty instead of on a class that does not exist.
    fname: student.fname ?? '',
    lname: student.lname ?? '',
    mname: student.mname ?? '',
    // The API writes a birthday DD/MM/YYYY; the picker reads YYYY-MM-DD, so
    // the row carries both — `born` to read, this one to edit from.
    dob: isoBirthday(student.dob),
    department_id: id(student.department_id),
    class_arm_id: id(student.class_arm_id),
    sparent_id: id(student.sparent_id),
    // The form picks a country by ISO code and a state by the school's own id,
    // so an edit opens on what the record holds. A country the school's table
    // numbers but no package does resolves to nothing, and the select opens
    // empty rather than on the wrong country.
    country: countryIso(student.country_id),
    state: id(student.state_id),
    studentstatus: student.studentstatus ?? '',
    // `status` above is whichever of the two says something; this is the
    // admission word itself, which is what the endpoint takes.
    admission: student.status ?? '',
    enrolled: asDate(student.joindate),
    username: text(student.user?.username),
  }
}

/**
 * Reads the first of these keys the record actually carries. The endpoints
 * below answer with `Record<string, unknown>` for their nested rows, so the
 * spelling is read rather than assumed.
 */
function pick(record: Record<string, unknown> | undefined, ...keys: string[]): string {
  for (const key of keys) {
    const value = record?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return ''
}

/** An amount the API sends as a string, written the way the design shows money. */
function naira(amount: string | null | undefined): string {
  const parsed = Number(amount)
  return amount && !Number.isNaN(parsed) ? formatNaira(parsed) : BLANK
}

/** One line of a pupil's fees tab, from `GET /students/{id}/invoices`. */
export function invoiceRow(invoice: Invoice): Row {
  return {
    id: String(invoice.id),
    invoice: text(invoice.invoiceid),
    fee: text(pick(invoice.fee, 'name', 'feename', 'fee_name', 'title')),
    amount: naira(invoice.amount),
    // The API says `success`; every other invoice column in the app says Paid,
    // and one pupil's fees tab is no place to start a second vocabulary.
    state: payStatus(invoice.paystatus),
  }
}

/**
 * One line of a pupil's results tab, from `GET /students/{id}/results`.
 *
 * That endpoint is typed `Record<string, unknown>` because no response has
 * been seen yet, so each cell is read by trying the spellings this API uses
 * elsewhere. A row it cannot name still gets a stable key from its position.
 */
export function resultRow(result: StudentResult, index: number): Row {
  const record = result as Record<string, unknown>

  return {
    id: pick(record, 'id') || `result-${index}`,
    subject: text(
      pick(record.subject as Record<string, unknown>, 'name', 'subject_name') ||
        pick(record, 'subject_name', 'subject'),
    ),
    total: text(pick(record, 'total', 'totalscore', 'score', 'mark')),
    grade: text(pick(record, 'grade', 'gradename', 'remark')),
  }
}

