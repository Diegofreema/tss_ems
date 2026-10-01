// Relative imports only, so `node --test` can load this — see CLAUDE.md.
import { z } from 'zod'
import { DOCUMENT_MAX_BYTES, tooLargeMessage } from '../../lib/file-size.ts'
import { RELIGIONS } from '../../portals/admin/collections/student-row.ts'

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const required = (label: string) => z.string().trim().min(1, `Enter ${label}`)
const optional = z.string().trim()

/** A phone number as people write one — `0803 123 4567`, `+234 803…`. */
export function isPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return /^\+?[\d\s()-]+$/.test(value) && digits.length >= 7 && digits.length <= 15
}

const phone = (label: string) =>
  required(label).refine(isPhone, 'That does not look like a phone number')

/** Optional, but an address when there is one. */
const email = optional.refine(
  (value) => value === '' || EMAIL.test(value),
  'That does not look like an email address',
)

/** An optional phone, checked when given. The parent rule below asks for it. */
const parentPhone = optional.refine(
  (value) => value === '' || isPhone(value),
  'That does not look like a phone number',
)

/**
 * A document the family may attach: optional, and no larger than the school
 * takes. Checked here as well as where it lands, so a file that got past the
 * drop zone is still named in its own size.
 */
const document = z
  .instanceof(File)
  .superRefine((file, context) => {
    if (file.size > DOCUMENT_MAX_BYTES) {
      context.addIssue({ code: 'custom', message: tooLargeMessage(file.size, DOCUMENT_MAX_BYTES) })
    }
  })
  .optional()

export const applicationSchema = z
  .object({
    // The child
    department_id: z.string().min(1, 'Choose the class your child is applying for'),
    fname: required('their first name'),
    mname: optional,
    lname: required('their surname'),
    gender: z.enum(['Female', 'Male'], { message: 'Choose one' }),
    dob: z
      .date({ message: 'Pick their date of birth' })
      .refine((date) => date < new Date(), 'A date of birth is in the past'),
    // The office's own four words, so an application lands on the register
    // spelt the way the enrolment form spells it — see `RELIGIONS`.
    religion: z.enum(RELIGIONS, { message: 'Choose one' }),
    pschools: optional,

    // Home
    address: required('the home address'),
    phone: phone('a phone number'),
    email,
    // The school's own ids, off its public lists. A state is required — the
    // backend holds `students.state_id` NOT NULL — and the LGA is the one of
    // the three that may be left empty.
    country_id: z.string().min(1, 'Choose a country'),
    state_id: z.string().min(1, 'Choose a state'),
    lga_id: optional,

    // Parents
    fathersname: optional,
    fatherphone: parentPhone,
    fathersjob: optional,
    mothersname: optional,
    motherphone: parentPhone,
    mothersjob: optional,
    pemailaddress: email,

    // Documents, each optional — the same three the office attaches at
    // enrolment, under the same names.
    passport: document,
    birth_certificate: document,
    other_certificates: document,
  })
  /*
   * At least one parent, and a way to reach whoever is named. Not both:
   * requiring a father and a mother turns away every family that has one,
   * and the school only needs somebody to call.
   */
  .superRefine((values, context) => {
    const father = values.fathersname.trim()
    const mother = values.mothersname.trim()
    if (!father && !mother) {
      context.addIssue({
        code: 'custom',
        path: ['fathersname'],
        message: 'Give at least one parent or guardian',
      })
      context.addIssue({
        code: 'custom',
        path: ['mothersname'],
        message: 'Give at least one parent or guardian',
      })
    }
    if (father && !values.fatherphone.trim()) {
      context.addIssue({ code: 'custom', path: ['fatherphone'], message: 'Add a number for him' })
    }
    if (mother && !values.motherphone.trim()) {
      context.addIssue({ code: 'custom', path: ['motherphone'], message: 'Add a number for her' })
    }
  })

export type ApplicationValues = z.infer<typeof applicationSchema>
export type ApplicationField = keyof ApplicationValues

/** Each field's label, shared by the step that asks and the review that reads back. */
export const LABELS: Record<ApplicationField, string> = {
  department_id: 'Class applying for',
  fname: 'First name',
  mname: 'Middle name',
  lname: 'Surname',
  gender: 'Gender',
  dob: 'Date of birth',
  religion: 'Religion',
  pschools: 'Previous school',
  address: 'Home address',
  phone: 'Phone number',
  email: "Child's email",
  country_id: 'Country',
  state_id: 'State of origin',
  lga_id: 'LGA',
  fathersname: "Father's name",
  fatherphone: "Father's phone",
  fathersjob: "Father's occupation",
  mothersname: "Mother's name",
  motherphone: "Mother's phone",
  mothersjob: "Mother's occupation",
  pemailaddress: 'Family email',
  passport: 'Passport photograph',
  birth_certificate: 'Birth certificate',
  other_certificates: 'Other certificates',
}

/** The fields that hold a file rather than typed text. */
export const DOCUMENT_FIELDS = ['passport', 'birth_certificate', 'other_certificates'] as const
export type DocumentField = (typeof DOCUMENT_FIELDS)[number]

export function isDocumentField(field: string): field is DocumentField {
  return (DOCUMENT_FIELDS as readonly string[]).includes(field)
}

export type ApplicationStep = {
  id: string
  title: string
  /** One line under the title, saying what the step is for. */
  blurb: string
  fields: readonly ApplicationField[]
}

/**
 * The form, a step at a time. Every field belongs to exactly one step —
 * `stepOf` relies on it to send a refusal from the school back to the step
 * the field is on, and the test holds it.
 */
export const STEPS: readonly ApplicationStep[] = [
  {
    id: 'child',
    title: 'About the child',
    blurb: 'The class they are applying for, and their name as it appears on their birth certificate.',
    fields: ['department_id', 'fname', 'mname', 'lname', 'gender', 'dob', 'religion', 'pschools'],
  },
  {
    id: 'home',
    title: 'Home',
    blurb: 'Where the family lives, and how the school reaches it.',
    fields: ['address', 'phone', 'country_id', 'state_id', 'lga_id', 'email'],
  },
  {
    id: 'parents',
    title: 'Parents',
    blurb: 'At least one parent or guardian the school can call.',
    fields: [
      'fathersname',
      'fatherphone',
      'fathersjob',
      'mothersname',
      'motherphone',
      'mothersjob',
      'pemailaddress',
    ],
  },
  {
    id: 'documents',
    title: 'Documents',
    blurb: 'Optional, and each one at most 1 MB. A clear phone photo is enough.',
    fields: DOCUMENT_FIELDS,
  },
  {
    id: 'review',
    title: 'Review',
    blurb: 'Check everything once more. Nothing is sent until you submit.',
    fields: [],
  },
]

/** Which step a field is on — where to send somebody the school refused. */
export function stepOf(field: string): number {
  const index = STEPS.findIndex((step) => (step.fields as readonly string[]).includes(field))
  return index === -1 ? STEPS.length - 1 : index
}

/**
 * Every typed field, in the order the form asks them — what a draft keeps.
 * Never a document: a `File` cannot be written to storage, and a photo of a
 * birth certificate is not something to leave on a café's machine anyway.
 */
export const DRAFT_FIELDS: readonly ApplicationField[] = STEPS.flatMap((step) => step.fields).filter(
  (field) => !isDocumentField(field),
)

export const EMPTY_APPLICATION: Partial<ApplicationValues> = {
  department_id: '',
  fname: '',
  mname: '',
  lname: '',
  pschools: '',
  address: '',
  phone: '',
  email: '',
  country_id: '',
  state_id: '',
  lga_id: '',
  fathersname: '',
  fatherphone: '',
  fathersjob: '',
  mothersname: '',
  motherphone: '',
  mothersjob: '',
  pemailaddress: '',
}
