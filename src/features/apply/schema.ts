// Relative imports only, so `node --test` can load this — see CLAUDE.md.
import { z } from 'zod'
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

export const applicationSchema = z
  .object({
    // The child
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
    state_id: optional,

    // Parents
    fathersname: optional,
    fatherphone: parentPhone,
    fathersjob: optional,
    mothersname: optional,
    motherphone: parentPhone,
    mothersjob: optional,
    pemailaddress: email,
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
  state_id: 'State of origin',
  fathersname: "Father's name",
  fatherphone: "Father's phone",
  fathersjob: "Father's occupation",
  mothersname: "Mother's name",
  motherphone: "Mother's phone",
  mothersjob: "Mother's occupation",
  pemailaddress: 'Family email',
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
    blurb: 'The child applying, as their name appears on their birth certificate.',
    fields: ['fname', 'mname', 'lname', 'gender', 'dob', 'religion', 'pschools'],
  },
  {
    id: 'home',
    title: 'Home',
    blurb: 'Where the family lives, and how the school reaches it.',
    fields: ['address', 'phone', 'email', 'state_id'],
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

/** Every field, in the order the form asks them — what a draft keeps. */
export const DRAFT_FIELDS: readonly ApplicationField[] = STEPS.flatMap((step) => step.fields)

export const EMPTY_APPLICATION: Partial<ApplicationValues> = {
  fname: '',
  mname: '',
  lname: '',
  pschools: '',
  address: '',
  phone: '',
  email: '',
  state_id: '',
  fathersname: '',
  fatherphone: '',
  fathersjob: '',
  mothersname: '',
  motherphone: '',
  mothersjob: '',
  pemailaddress: '',
}
