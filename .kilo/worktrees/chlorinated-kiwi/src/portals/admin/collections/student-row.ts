import type { ConfirmTone } from '../../../components/feedback/confirm-tone.ts'
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
 * states the student is not currently in, and says so in the past tense once the
 * API has taken it.
 *
 * Both ways are asked about first. Taking the enrolment away is the obvious
 * one, but handing it back is a decision too — it lets a student the school
 * suspended sign in and sit in class again — and the two buttons sit in the
 * same place on the row, so a misread status would otherwise undo a suspension
 * with one click and nothing on screen in between.
 */
export function suspendAction(status: string): {
  label: string
  next: 'Active' | 'Suspended'
  done: string
  title: string
  cta: string
  body: string
  tone: ConfirmTone
} {
  return status === 'Suspended'
    ? {
        label: 'Reinstate',
        next: 'Active',
        done: 'reinstated',
        title: 'Reinstate this student?',
        cta: 'Reinstate the student',
        body: 'Their enrolment goes back to active: they can sign in again and take their place in the arm the school kept for them. They can be suspended again from the same button.',
        tone: 'brand',
      }
    : {
        label: 'Suspend',
        next: 'Suspended',
        done: 'suspended',
        title: 'Suspend this student?',
        cta: 'Suspend the student',
        body: 'They stay on the register and keep their record. They cannot sign in, and their arm keeps the place until they are reinstated.',
        tone: 'danger',
      }
}

/**
 * A student, as both the register and their own record read them. The list
 * endpoint expands fewer relations than the detail one, so the fields only
 * `GET /students/{id}` answers for come back blank in the table — which never
 * shows them anyway.
 *
 * `fees` stays blank throughout: whether a student owes is `GET /users/fees/{id}`,
 * one request per student, so the column waits for an endpoint that answers for
 * a page at a time.
 *
 * `guardians` names the households the school holds, keyed by id. The student
 * record carries `sparent_id` but no name to go with it, so without the
 * lookup the column falls back to whichever parent was typed onto the student.
 */
/**
 * The four the form offers. Typed free, the same faith reached this register
 * as "Chistian", "Chritian", "Chritstian" and "Christian" — four spellings of
 * one word across eight students — so the office picks from a list now.
 */
export const RELIGIONS = ['Christian', 'Muslim', 'Traditionalist', 'Others'] as const

/**
 * A stored religion as one of the four, where it is one of the four.
 *
 * Only the case is reconciled: "TRADITIONALIST" is the option shouted, and
 * matching it means an edit opens on the answer already on file. A spelling
 * the list does not hold is left exactly as the school typed it — the panel
 * shows what is really there, and the select, finding no such option, opens
 * empty so the required field has to be answered properly before it saves.
 */
function religionOf(value: string | null | undefined): string {
  const said = value?.trim()
  if (!said) return BLANK
  return RELIGIONS.find((one) => one.toLowerCase() === said.toLowerCase()) ?? said
}

export function studentRow(
  student: Student,
  guardians?: ReadonlyMap<string, string>,
): Row {
  const guardian = student.sparent
  return {
    id: String(student.id),
    adm: text(student.regno ?? student.application_no),
    name: text([student.fname, student.mname, student.lname].filter(Boolean).join(' ')),
    arm: text(student.class_arm?.arm_name ?? student.department?.name),
    // The linked household where one is known, and otherwise whichever parent
    // was typed onto the student — which is all the student record itself holds.
    parent: text(
      guardians?.get(String(student.sparent_id)) ??
        (student.fathersname || student.mothersname),
    ),
    fees: BLANK,
    // `status` is where they are in admission — every enrolled student reads
    // "Admitted". `studentstatus` is the one that says Active or Suspended.
    status: text(student.studentstatus ?? student.status),

    // Everything below is read by the record panel rather than the table.
    class: text(student.department?.name),
    gender: text(student.gender),
    // Read through the same function the picker uses, so a student the office
    // enrolled here is shown "10 Nov 1986" like every other record rather than
    // the raw YYYY-MM-DD this form stored them as.
    born: birthday(student.dob),
    religion: religionOf(student.religion),
    email: text(student.email),
    phone: text(student.phone),
    address: text(student.address),
    origin: joined(student.community, student.state?.name, student.country?.name),
    school: text(student.previousschool),
    // The linked household, expanded on the detail call. Each parent reads as
    // name, phone and job; the student's own typed fields are the fallback for
    // a record entered before a household was linked, and are usually empty.
    father: joined(
      guardian?.fathersname ?? student.fathersname,
      guardian?.fatherphone ?? student.fatherphone,
      guardian?.fathersjob,
    ),
    mother: joined(
      guardian?.mothersname ?? student.mothersname,
      guardian?.motherphone ?? student.motherphone,
      guardian?.mothersjob,
    ),
    // The household's own, which the student record does not otherwise carry.
    guardianEmail: text(guardian?.pemailaddress),
    guardianHome: text(guardian?.address),
    admitted: text(student.admissiondate),

    // The edit form is keyed as the endpoint is, and prefills from here. Ids
    // are blank rather than "0" where the school has not set one, so a select
    // opens empty instead of on a class that does not exist.
    fname: student.fname ?? '',
    lname: student.lname ?? '',
    mname: student.mname ?? '',
    previousschool: student.previousschool ?? '',
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

/** One line of a student's fees tab, from `GET /students/{id}/invoices`. */
export function invoiceRow(invoice: Invoice): Row {
  return {
    id: String(invoice.id),
    invoice: text(invoice.invoiceid),
    fee: text(pick(invoice.fee, 'name', 'feename', 'fee_name', 'title')),
    amount: naira(invoice.amount),
    // The API says `success`; every other invoice column in the app says Paid,
    // and one student's fees tab is no place to start a second vocabulary.
    state: payStatus(invoice.paystatus),
  }
}

/**
 * One line of a student's results tab, from `GET /students/{id}/results`.
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

