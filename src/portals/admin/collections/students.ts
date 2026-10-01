import type { Parent } from '@/api/parents/types'
import type { Student } from '@/api/students/types'
import { heldRows } from '@/db/collection'
import { refClasses, refGuardians, refSessions, refStudents } from '@/db/collections/reference'
import { enqueue } from '@/db/drain'
import { SET, WRITE } from '@/db/ids'
import { DRAWN_STATES, isLocalKey, newLocalKey, type OutboxOp } from '@/db/outbox'
import { outbox } from '@/db/store'
import { guardianOption } from '@/features/collections/guardian-option'
import { localFirst } from '@/features/collections/local-first'
import { BLANK } from '@/features/collections/blank'
import { byId } from '@/features/collections/order'
import { byClassArmAndStanding } from './narrow'
import { pendingStanding, withPendingState } from './pending-state'
import { optionLabels } from '@/features/collections/option-feeds'
import { studentsService } from '@/api/students/service'
import { carriesFile } from '@/api/client'
import { DOCUMENT_MAX_BYTES } from '@/lib/file-size'
import type {
  CollectionDef,
  FieldSpec,
  FormSectionSpec,
  Row,
} from '@/features/collections/types'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { studentBody } from './student-body'
import { applicantDocuments, applicantRow } from './applicant-row'
import { invoiceRow, RELIGIONS, resultRow, studentRow, suspendAction } from './student-row'

/** The API accepts exactly these words for the two status fields. */
const ADMISSION = ['Applied', 'Admitted', 'Declined'] as const
const ENROLMENT = ['Active', 'Suspended'] as const

/** Where an application sits until somebody decides it. */
const APPLIED = 'Applied'

/**
 * A student enrolled through this form is admitted and on the register from the
 * moment they are created — the office never had another answer to give, so
 * the form does not ask.
 */
const ADMITTED = 'Admitted'
const ACTIVE = 'Active'

/**
 * A summary figure, asked for as one row and read off the pagination the
 * endpoint returns with it — there is no endpoint that counts without listing.
 */
/**
 * How many of the students on this device answer to something.
 *
 * The queue counts too, for the one figure it can move: a register showing a
 * student suspended under a tile reading "Suspended 0" would be disagreeing with
 * itself in the same eyeful. Admission is not something this app queues, so
 * only the standing is read through the queue.
 */
const countHeld = (
  matches: (student: Student, standing: string) => boolean,
) => async () => {
  const all = await heldRows(refStudents)
  const queued = pendingStanding(outbox().toArray)
  return all.filter((student) =>
    matches(student, queued.get(String(student.id)) ?? (student.studentstatus ?? '')),
  ).length
}


/** The households the school holds, so the register can name a student's own. */
const guardianNames = () => optionLabels('guardians')

/** The same lookup, built off the household set the register already holds. */
const namesFrom = (guardians: Parent[]): ReadonlyMap<string, string> =>
  new Map(guardians.map((parent) => {
    const option = guardianOption(parent)
    return [option.value, option.label]
  }))

/**
 * The session a student enrolled now joins, read off the device.
 *
 * The school's own `sessions/current` is the authority, and asking it is what
 * used to make enrolling a student impossible without a connection — a create
 * that has to read the school before it can write cannot be queued. The same
 * fact is on the sessions set, which every office form already reads, so it is
 * taken from there instead.
 *
 * A make-current queued and not yet sent is not reflected here: this is the
 * year the *school* is in, which is the one the student should be filed under.
 */
async function currentSessionId(): Promise<number | undefined> {
  const sessions = await heldRows(refSessions)
  return sessions.find((session) => session.is_current)?.id
}

/**
 * Students enrolled on this device that the school has not seen.
 *
 * No admission number: the school issues it, so the column reads as a dash
 * rather than inventing one.
 */
function queuedStudents(ops: readonly OutboxOp[]): Row[] {
  return ops
    .filter(
      (op) =>
        op.handler === WRITE.enrolStudent &&
        DRAWN_STATES.includes(op.state) &&
        typeof op.targetKey === 'string',
    )
    .sort((one, two) => two.seq - one.seq)
    .map((op) => {
      const body = op.payload as Record<string, unknown>
      const named = [body.fname, body.mname, body.lname]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(' ')
      return {
        id: op.targetKey as string,
        adm: BLANK,
        name: named || 'Unnamed student',
        arm: BLANK,
        parent: BLANK,
        fees: BLANK,
        status: 'Waiting to send',
        admission: '',
        studentstatus: '',
        department_id: String(body.department_id ?? ''),
        class_arm_id: String(body.class_arm_id ?? ''),
      }
    })
}

/** Students, with a queued suspension or reinstatement shown. */
const withPendingStanding = (rows: Row[], ops: readonly OutboxOp[]) =>
  withPendingState(rows, ops, WRITE.setStudentStanding, (payload) => {
    const change = payload as { id?: unknown; status?: unknown } | null
    if (change?.id === undefined) return undefined
    return { id: String(change.id), state: String(change.status) }
  })

/** A filter's id as the endpoint wants it; an unset filter is left off. */
function asId(value: string | undefined) {
  return Number(value) || undefined
}

/** Who the student is, as the enrolment form asks for them. */
const IDENTITY: FormSectionSpec = {
  title: 'Student',
  fields: [
    { key: 'fname', label: 'First name', required: true, placeholder: 'Ngozi' },
    { key: 'lname', label: 'Surname', required: true, placeholder: 'Eze' },
    { key: 'mname', label: 'Middle name', placeholder: 'Chiamaka' },
    { key: 'dob', label: 'Date of birth', required: true, date: true, past: true },
    { key: 'gender', label: 'Gender', required: true, options: ['Female', 'Male'] },
    { key: 'religion', label: 'Religion', required: true, options: [...RELIGIONS] },
    // The student's own, not the household's — that one is on the guardian
    // record, and this is the address the student signs in with.
    /*
     * Not required: a child enrolling at a Nigerian school very often has no
     * address of their own, and the office was inventing one to get past the
     * form. `studentBody` drops an empty box rather than sending a blank.
     *
     * The hint no longer claims this *is* the login. It usually becomes one,
     * but not always and not for ever: of four students read off this school,
     * two sign in with an address that is not the one on their record, and
     * the test login on file is a registration number. The school issues the
     * username itself and the enrol endpoint does not report it back — unlike
     * a guardian's, which answers with the login beside the record — so what
     * a student actually signs in with is read off their record afterwards.
     *
     * Which is also why it is not held to being an address at all. The office
     * has to be able to put the registration number in here for a child with
     * no email, and a box that refuses one refuses what the school issued
     * itself. `emailOrUsername` still catches a half-typed address, since an
     * `@` is only ever an address being attempted.
     */
    {
      key: 'email',
      label: 'Email or username',
      emailOrUsername: true,
      placeholder: 'student@example.com, or their number',
      hint: 'Where the school can reach the student. An address if they have one, otherwise whatever the school knows them by — a registration number is fine. Leaving it empty means checking the record afterwards for what they sign in with.',
    },
    { key: 'phone', label: 'Phone', required: true, numeric: true, placeholder: '0705 883 1190' },
    {
      key: 'address',
      label: 'Home address',
      required: true,
      multiline: true,
      wide: true,
      placeholder: '14 Ogui Road, Enugu',
      hint: 'Where the student lives — the household on the guardian record, unless the student boards elsewhere.',
    },
  ],
}

/**
 * Where the student is from. The endpoint takes both as the school's own
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
    {
      key: 'previousschool',
      label: 'Previous school',
      wide: true,
      placeholder: 'Holy Ghost Primary School, Enugu',
      hint: 'Where they were before this one. Leave empty if this is their first.',
    },
  ],
}

/**
 * Who to reach about this student. The household already holds the email, the
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
      // Guardians run to the hundreds, so the office searches by father or
      // mother's name rather than scrolling a dropdown of all of them. The
      // linked household's name is on the row, so an edit opens showing it.
      searchFrom: 'guardians',
      searchLabelKey: 'parent',
      hint: 'Search by the father or mother’s name. Their email, phone and address come with the household — add it under Parents first if it is not listed.',
    },
  ],
}

/** Only a new record asks for its documents; the edit form is the record's text. */
const creating = (record?: Row) => !record

/**
 * The documents taken at enrolment, each optional and each sent under the
 * school's own name for it — `passport`, `birth_certificate`,
 * `other_certificates`.
 *
 * A file cannot wait on the device — the queue stores a body as data, and a
 * `File` is not data it can hold — so an enrolment carrying any of these goes
 * to the school now or is not saved, and the form stays open to say so. Left
 * empty, the enrolment is the one it always was and saves offline as before.
 */
const DOCUMENTS: FormSectionSpec = {
  title: 'Documents',
  fields: [
    {
      key: 'passport',
      label: 'Passport photograph',
      file: 'image/*',
      maxBytes: DOCUMENT_MAX_BYTES,
      when: creating,
      hint: 'Optional, up to 1 MB each. Attaching any document means this enrolment needs a connection to save.',
    },
    {
      key: 'birth_certificate',
      label: 'Birth certificate',
      file: 'image/*,.pdf',
      maxBytes: DOCUMENT_MAX_BYTES,
      when: creating,
    },
    {
      key: 'other_certificates',
      label: 'Other certificates',
      file: 'image/*,.pdf',
      maxBytes: DOCUMENT_MAX_BYTES,
      when: creating,
      hint: 'A medical record, a health certificate — anything else the school keeps on file.',
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
  { key: 'guardianEmail', label: 'Guardian email' },
  { key: 'guardianHome', label: 'Guardian address' },
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
  title: 'Enrolled students',
  description:
    'Every enrolled student across JSS 1 to SSS 3. Open a student for their record, fees and results.',
  action: 'Enrol a student',
  searchHint: 'Search name or admission no.',
  footer: 'Student register',
  emptyTitle: 'No students on the register',
  emptyBody: 'Enrol your first student, or admit one from the applicants list.',
  noun: 'student',
  nameKey: 'name',
  // Counted off the device, from the same set the register draws.
  counts: [
    { label: 'Enrolled', count: countHeld((one) => one.status === 'Admitted') },
    {
      label: 'Suspended',
      count: countHeld((_one, standing) => standing === 'Suspended'),
    },
    { label: 'Applicants', count: countHeld((one) => one.status === APPLIED) },
    { label: 'Classes', count: async () => (await heldRows(refClasses)).length },
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
  // Enrolment is its own endpoint rather than a field on the student, so it is
  // offered where the office is already looking at the register.
  rowAction: {
    label: (row) => suspendAction(row.status).label,
    // Asked about both ways: see `suspendAction`, which holds what each of the
    // two dialogs says.
    title: (row) => suspendAction(row.status).title,
    cta: (row) => suspendAction(row.status).cta,
    confirm: (row) => suspendAction(row.status).body,
    tone: (row) => suspendAction(row.status).tone,
    done: (row) => `${row.name} ${suspendAction(row.status).done}`,
    queueRun: (row) =>
      enqueue({
        handler: WRITE.setStudentStanding,
        payload: { id: row.id, status: suspendAction(row.status).next },
        collectionId: SET.refStudents,
        targetKey: row.id,
        toast: { success: `${row.name} ${suspendAction(row.status).done}` },
        label: `Student “${row.name}”`,
      }),
  },
  /*
   * Read off the device, joined to the household directory.
   *
   * The student register is the one set that scales with the school rather than
   * with how it is organised, and it is held whole — see `A_SCHOOL`. A school
   * in the thousands wants this paged at the endpoint again.
   */
  collection: localFirst({
    entities: refStudents,
    lookup: refGuardians,
    rows: (all: Student[], guardians: Parent[]) => {
      const named = namesFrom(guardians)
      return byId(all).map((student) => studentRow(student, named))
    },
    narrow: byClassArmAndStanding,
    queued: queuedStudents,
    overlay: withPendingStanding,
  }),
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
  record: async (recordId) => {
    if (isLocalKey(recordId)) {
      return queuedStudents(outbox().toArray).find((row) => row.id === recordId)
    }
    return studentRow(await studentsService.get(recordId), await guardianNames())
  },
  queue: async (values, recordId) => {
    if (recordId) {
      return enqueue({
        handler: WRITE.updateStudent,
        payload: { id: recordId, body: studentBody(values) },
        collectionId: SET.refStudents,
        targetKey: recordId,
        toast: { success: 'Student updated' },
        label: `Student record`,
      })
    }

    // A new student joins the session the school is currently running. Editing
    // one never moves them between sessions, so this is only read here — and
    // it is read off the device, which is what lets an enrolment be written
    // with no connection at all.
    const session = await currentSessionId()
    const body = studentBody(values, session)
    return enqueue({
      handler: WRITE.enrolStudent,
      payload: {
        ...body,
        status: ADMITTED,
        studentstatus: ACTIVE,
      },
      collectionId: SET.refStudents,
      targetKey: newLocalKey(),
      toast: { success: 'Student enrolled' },
      label: `Enrolment`,
      // See `DOCUMENTS`: a file goes now or not at all.
      wireOnly: carriesFile(body)
        ? 'The documents need a connection to the school. Try again once you are back online, or remove them to save on this device.'
        : undefined,
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
          // an arm leaves the student in an arm of the class they just left.
          required: true,
          optionsFrom: 'arms',
          dependsOn: 'department_id',
          hint: 'Arms belong to a class, so pick the class first.',
        },
      ],
    },
    ORIGIN,
    CONTACT,
    DOCUMENTS,
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
  // Counted off the device, from the same set the queue is drawn from.
  counts: [
    { label: 'Awaiting review', count: countHeld((one) => one.status === APPLIED) },
    { label: 'Admitted', count: countHeld((one) => one.status === 'Admitted') },
    { label: 'Declined', count: countHeld((one) => one.status === 'Declined') },
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
    /*
     * Unset, the page is the queue: everyone still waiting on a decision. The
     * two decided words are there to look back at what was settled.
     *
     * `replaces`, because none of the three is a part of the others: unset does
     * not mean "all applications", it means one of three separate queues. So
     * the count beside the search reads matches alone rather than claiming a
     * whole that nothing on the page is measuring.
     */
    {
      key: 'status',
      label: 'Awaiting review',
      options: ['Admitted', 'Declined'],
      replaces: true,
    },
    { key: 'department_id', label: 'All classes', optionsFrom: 'classes' },
  ],
  /*
   * The same set as the register above, read as applications rather than as
   * students — an application *is* a student record, at the stage before the
   * office has decided about it.
   *
   * Its filter does not narrow the queue, it moves between three of them: unset
   * is everyone still waiting, and the two decided words are there to look back
   * at what was settled. So the default is written down here rather than left
   * to mean "all", exactly as the endpoint call below spells it.
   */
  collection: localFirst({
    entities: refStudents,
    rows: (all: Student[]) => byId(all).map(applicantRow),
    narrow: (rows, filters) =>
      rows.filter((row) => {
        if (row.admission !== (filters.status || APPLIED)) return false
        const klass = filters.department_id?.trim()
        return !klass || String(row.department_id ?? '') === klass
      }),
  }),
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

