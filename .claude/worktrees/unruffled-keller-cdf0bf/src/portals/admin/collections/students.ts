import { optionLabels } from '@/features/collections/option-feeds'
import { sessionsService } from '@/api/calendar/service'
import { departmentsService } from '@/api/departments/service'
import { studentsService } from '@/api/students/service'
import type { StudentListParams } from '@/api/students/types'
import type {
  CollectionDef,
  FieldSpec,
  FormSectionSpec,
} from '@/features/collections/types'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { studentBody } from './student-body'
import { applicantDocuments, applicantRow } from './applicant-row'
import { invoiceRow, resultRow, studentRow, suspendAction } from './student-row'

/** The API accepts exactly these words for the two status fields. */
const ADMISSION = ['Applied', 'Admitted', 'Declined'] as const
const ENROLMENT = ['Active', 'Suspended'] as const

/** Where an application sits until somebody decides it. */
const APPLIED = 'Applied'

/**
 * A pupil enrolled through this form is admitted and on the register from the
 * moment they are created — the office never had another answer to give, so
 * the form does not ask.
 */
const ADMITTED = 'Admitted'
const ACTIVE = 'Active'

/**
 * A summary figure, asked for as one row and read off the pagination the
 * endpoint returns with it — there is no endpoint that counts without listing.
 */
const countStudents = (params: StudentListParams) => async () =>
  (await studentsService.list({ ...params, limit: 1 })).pagination.total

/** The households the school holds, so the register can name a pupil's own. */
const guardianNames = () => optionLabels('guardians')

/** A filter's id as the endpoint wants it; an unset filter is left off. */
function asId(value: string | undefined) {
  return Number(value) || undefined
}

/** Who the pupil is, as the enrolment form asks for them. */
const IDENTITY: FormSectionSpec = {
  title: 'Pupil',
  fields: [
    { key: 'fname', label: 'First name', required: true, placeholder: 'Ngozi' },
    { key: 'lname', label: 'Surname', required: true, placeholder: 'Eze' },
    { key: 'mname', label: 'Middle name', placeholder: 'Chiamaka' },
    { key: 'dob', label: 'Date of birth', required: true, date: true, past: true },
    { key: 'gender', label: 'Gender', required: true, options: ['Female', 'Male'] },
    { key: 'religion', label: 'Religion', required: true, placeholder: 'Christian' },
    // The pupil's own, not the household's — that one is on the guardian
    // record, and this is the address the pupil signs in with.
    {
      key: 'email',
      label: 'Email',
      required: true,
      email: true,
      placeholder: 'pupil@example.com',
      hint: 'The pupil signs in with this.',
    },
    { key: 'phone', label: 'Phone', required: true, numeric: true, placeholder: '0705 883 1190' },
    {
      key: 'address',
      label: 'Home address',
      required: true,
      multiline: true,
      wide: true,
      placeholder: '14 Ogui Road, Enugu',
      hint: 'Where the pupil lives — the household on the guardian record, unless the pupil boards elsewhere.',
    },
  ],
}

/**
 * Where the pupil is from. The endpoint takes both as the school's own
 * numbers, and publishes no catalogue for either — `/countries` and `/states`
 * are undeployed — so only the places it has been read to hold can be saved.
 */
const ORIGIN: FormSectionSpec = {
  title: 'Where they are from',
  fields: [
    {
      key: 'country',
      label: 'Country',
      required: true,
      optionsFrom: 'countries',
      hint: 'The school numbers countries its own way and publishes no list, so only the ones it has been seen to hold can be saved.',
    },
    {
      key: 'state',
      label: 'State',
      required: true,
      optionsFrom: 'states',
      dependsOn: 'country',
      hint: 'Only Nigeria’s states carry numbers this school can store.',
    },
  ],
}

/**
 * Who to reach about this pupil. The household already holds the email, the
 * phone and the address, so the form links to it by id rather than asking the
 * office to copy three fields it has on file under Parents.
 */
const CONTACT: FormSectionSpec = {
  title: 'Guardian',
  fields: [
    {
      key: 'sparent_id',
      label: 'Guardian on record',
      required: true,
      wide: true,
      optionsFrom: 'guardians',
      hint: 'Their email, phone and address come with the household. Add it under Parents first if it is not listed.',
    },
  ],
}

const CLASS_FIELD: FieldSpec = {
  key: 'department_id',
  label: 'Class',
  required: true,
  optionsFrom: 'classes',
}

/** What the record panel reads about the person, whichever page opened it. */
const PERSON_DETAIL = [
  { key: 'gender', label: 'Gender' },
  { key: 'born', label: 'Date of birth' },
  { key: 'religion', label: 'Religion' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'origin', label: 'From' },
  { key: 'school', label: 'Previous school' },
  { key: 'father', label: 'Father' },
  { key: 'mother', label: 'Mother' },
]

export const students: CollectionDef = {
  id: 'students',
  tabs: [
    {
      label: 'Fees',
      columns: [
        { key: 'invoice', label: 'Invoice' },
        { key: 'fee', label: 'Fee' },
        { key: 'amount', label: 'Amount', align: 'right' },
        { key: 'state', label: 'State', tag: true },
      ],
      source: (recordId) => studentsService.invoices(recordId).then((invoices) => invoices.map(invoiceRow)),
    },
    {
      label: 'Results',
      // Approved results only — that is all this endpoint returns.
      columns: [
        { key: 'subject', label: 'Subject' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'grade', label: 'Grade', tag: true },
      ],
      source: (recordId) => studentsService.results(recordId).then((results) => results.map(resultRow)),
    },
  ],
  path: '/admin/students',
  kicker: 'Students',
  title: 'Enrolled pupils',
  description:
    'Every enrolled pupil across Primary 1 to SS3. Open a pupil for their record, fees and results.',
  action: 'Enrol a pupil',
  searchHint: 'Search name or admission no.',
  footer: 'Pupil register',
  emptyTitle: 'No pupils on the register',
  emptyBody: 'Enrol your first pupil, or admit one from the applicants list.',
  noun: 'pupil',
  nameKey: 'name',
  counts: [
    { label: 'Enrolled', count: countStudents({ status: 'Admitted' }) },
    { label: 'Suspended', count: countStudents({ studentstatus: 'Suspended' }) },
    { label: 'Applicants', count: countStudents({ status: APPLIED }) },
    {
      label: 'Classes',
      count: async () =>
        (await departmentsService.list({ limit: 1 })).pagination.total,
    },
  ],
  columns: [
    { key: 'adm', label: 'Adm. no.', cardRole: 'subtitle' },
    { key: 'name', label: 'Name', cardRole: 'title' },
    { key: 'arm', label: 'Arm' },
    { key: 'parent', label: 'Parent' },
    { key: 'fees', label: 'Fees', tag: true },
    { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'adm', label: 'Adm. no.' },
    { key: 'name', label: 'Name' },
    { key: 'class', label: 'Class' },
    { key: 'arm', label: 'Arm' },
    { key: 'status', label: 'Status' },
    ...PERSON_DETAIL,
    { key: 'admitted', label: 'Admitted' },
    { key: 'enrolled', label: 'Enrolled' },
    { key: 'username', label: 'Signs in with' },
  ],
  filters: [
    { key: 'department_id', label: 'All classes', optionsFrom: 'classes' },
    {
      key: 'class_arm_id',
      label: 'All arms',
      optionsFrom: 'arms',
      dependsOn: 'department_id',
    },
    { key: 'status', label: 'Any admission', options: ADMISSION },
    { key: 'studentstatus', label: 'Any enrolment', options: ENROLMENT },
  ],
  // Enrolment is its own endpoint rather than a field on the pupil, so it is
  // offered where the office is already looking at the register.
  rowAction: {
    label: (row) => suspendAction(row.status).label,
    confirm: (row) =>
      row.status === 'Suspended'
        ? undefined
        : 'They stay on the register and keep their record. They cannot sign in, and their arm keeps the place until they are reinstated.',
    done: (row) => `${row.name} ${suspendAction(row.status).done}`,
    run: (row) =>
      studentsService.setStatus(row.id, { status: suspendAction(row.status).next }),
  },
  source: async ({ page, q, filters }) => {
    // Both at once: the register does not wait on the guardian names to know
    // who is on it, and a slow directory cannot hold up the page.
    const [{ items, pagination }, guardians] = await Promise.all([
      studentsService.list({
        page,
        limit: PAGE_SIZE,
        q,
        department_id: asId(filters.department_id),
        class_arm_id: asId(filters.class_arm_id),
        status: filters.status || undefined,
        studentstatus: filters.studentstatus || undefined,
      }),
      guardianNames(),
    ])
    return { items: items.map((student) => studentRow(student, guardians)), pagination }
  },
  record: async (recordId) =>
    studentRow(await studentsService.get(recordId), await guardianNames()),
  save: async (values, recordId) => {
    if (recordId) return studentsService.update(recordId, studentBody(values))

    // A new pupil joins the session the school is currently running. Editing
    // one never moves them between sessions, so this is only asked for here.
    const session = await sessionsService.current().catch(() => undefined)
    return studentsService.create({
      ...studentBody(values, session?.id),
      status: ADMITTED,
      studentstatus: ACTIVE,
    })
  },
  form: [
    IDENTITY,
    {
      title: 'Class',
      fields: [
        CLASS_FIELD,
        {
          key: 'class_arm_id',
          label: 'Arm',
          // Required as the design has it, and because a class changed without
          // an arm leaves the pupil in an arm of the class they just left.
          required: true,
          optionsFrom: 'arms',
          dependsOn: 'department_id',
          hint: 'Arms belong to a class, so pick the class first.',
        },
      ],
    },
    ORIGIN,
    CONTACT,
  ],
}

export const applicants: CollectionDef = {
  id: 'applicants',
  path: '/admin/applicants',
  kicker: 'Students',
  title: 'Applicants',
  description:
    'Admission applications waiting on a decision. Review the file, then admit into a class arm or decline.',
  // Applications arrive from families through the admission form, so the
  // office never types one in. It reads the file and decides — which is the
  // record's own flow, not anything this list creates.
  action: 'Review application',
  readonly: true,
  searchHint: 'Search applicant',
  footer: 'Applications',
  emptyTitle: 'No applications',
  emptyBody:
    'Applications appear here as families submit them through the admission form.',
  noun: 'application',
  nameKey: 'name',
  counts: [
    { label: 'Awaiting review', count: countStudents({ status: APPLIED }) },
    { label: 'Admitted', count: countStudents({ status: 'Admitted' }) },
    { label: 'Declined', count: countStudents({ status: 'Declined' }) },
  ],
  columns: [
    { key: 'ref', label: 'Reference', cardRole: 'subtitle' },
    { key: 'name', label: 'Applicant', cardRole: 'title' },
    { key: 'applying', label: 'Applying to' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'stage', label: 'Stage', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'ref', label: 'Reference' },
    { key: 'name', label: 'Applicant' },
    { key: 'applying', label: 'Applying to' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'stage', label: 'Stage' },
    ...PERSON_DETAIL,
  ],
  tabs: [
    {
      label: 'Documents on file',
      columns: [
        { key: 'document', label: 'Document' },
        { key: 'file', label: 'File', download: true },
      ],
      source: async (recordId) => {
        const row = applicantRow(await studentsService.get(recordId))
        return applicantDocuments(row).map((one) => ({
          id: one.key,
          document: one.label,
          // The cell fetches whatever name it is given, so a slot with no
          // file has to hand it nothing rather than the words for nothing.
          file: one.file,
        }))
      },
    },
  ],
  filters: [
    // Unset, the page is the queue: everyone still waiting on a decision.
    // The two decided words are there to look back at what was settled.
    { key: 'status', label: 'Awaiting review', options: ['Admitted', 'Declined'] },
    { key: 'department_id', label: 'All classes', optionsFrom: 'classes' },
  ],
  source: async ({ page, q, filters }) => {
    const { items, pagination } = await studentsService.list({
      page,
      limit: PAGE_SIZE,
      q,
      status: filters.status || APPLIED,
      department_id: asId(filters.department_id),
    })
    return { items: items.map(applicantRow), pagination }
  },
  record: (recordId) => studentsService.get(recordId).then(applicantRow),
}

