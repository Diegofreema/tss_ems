import { adminsService } from '@/api/admins/service'
import { classArmsService } from '@/api/class-arms/service'
import { collectFeesService } from '@/api/collect-fees/service'
import { departmentsService } from '@/api/departments/service'
import { feesService } from '@/api/fees/service'
import { libraryService } from '@/api/library/service'
import { studentsService } from '@/api/students/service'
import { subjectsService } from '@/api/subjects/service'
import { teachersService } from '@/api/teachers/service'
import { isSuperAdminRole } from '@/features/auth/role'
import { superAdminSignedIn } from '@/features/auth/session'
import { toApiDate } from '@/features/collections/date-range'
import type { Row } from '@/features/collections/types'
import {
  ADMIT,
  admission,
  type ReviewValues,
} from '@/portals/admin/collections/admission'
import { applicantDocuments } from '@/portals/admin/collections/applicant-row'
import { collecting, figure, payAction, paymentBody } from '@/portals/admin/collections/collect-row'
import { parseStaffKey } from '@/portals/admin/collections/staff-row'
import { parseBatchId } from '@/portals/admin/collections/result-row'
import { resultsService } from '@/api/results/service'
import {
  moveOutcome,
  type MoveValues,
  studentMove,
} from '@/portals/admin/collections/student-move'
import { formatNaira, parseNaira } from '@/lib/format'
import type { ActionDef } from './types'

export type AdminFlow = {
  /** Which flow this is, and what `?flow=` in the URL calls it. */
  name: string
  /** Button label on the record, e.g. "Allocate to classes". */
  label: string
  /** The flow needs no record, so the list's primary action opens it. */
  fromList?: boolean
  /** Records the flow can run against; offered on every record without it. */
  when?: (record: Row) => boolean
  /** Whether it may be run at all — by this account, on this record. */
  allowed?: (record?: Row) => boolean
  /** Why it was refused, where want of a privilege is not the reason. */
  deniedBody?: (record?: Row) => string | undefined
  build: (row?: Row) => ActionDef | Promise<ActionDef>
}

/** Everything on one page — a school has classes in the dozens. */
const ALL_CLASSES = 200

/** Same again for the two registers a teacher's flows read whole. */
const ALL_SUBJECTS = 300
const ALL_TEACHERS = 300

const DASH = '—'

/** The pupil as the picker names them. */
function pupilName(pupil: { fname: string; lname: string; mname?: string | null }) {
  return [pupil.fname, pupil.mname, pupil.lname].filter(Boolean).join(' ')
}

/**
 * Allocating a fee to classes.
 *
 * The design picks class arms; `POST /fees/{id}/allocate` takes classes and
 * levels, and knows nothing about arms — so the picker offers classes. Each
 * one is asked how many pupils it holds, because the whole point of this
 * screen is seeing what pressing the button will bill.
 *
 * Passing `departments` replaces the whole set, so the classes a fee is
 * already charged to arrive ticked: unticking one is how it is unallocated.
 */
async function allocate(row?: Row): Promise<ActionDef> {
  const amount = parseNaira(row?.amount ?? '')
  const classes = await departmentsService
    .list({ limit: ALL_CLASSES })
    .then((page) => page.items)
    .catch(() => [])

  const headcounts = await Promise.all(
    classes.map((department) =>
      studentsService
        .list({ department_id: department.id, status: 'Admitted', limit: 1 })
        .then((page) => page.pagination.total)
        .catch(() => 0),
    ),
  )

  return {
    kicker: 'Finance · Fee catalogue',
    title: `Allocate ${row?.name ?? 'this fee'}`,
    description:
      'Pick the classes this fee applies to. Invoices are raised for every pupil in them, at the amount on the fee.',
    summary: [
      { label: 'Fee', value: row?.name ?? DASH },
      { label: 'Per pupil', value: formatNaira(amount) },
      { label: 'Charged to', value: row?.charge ?? DASH },
    ],
    picker: {
      title: 'Classes',
      items: classes.map((department, index) => ({
        key: String(department.id),
        label: department.name,
        meta: `${headcounts[index]} ${headcounts[index] === 1 ? 'pupil' : 'pupils'}`,
        count: headcounts[index],
      })),
      // Unticking is how a class is dropped, so what it is already charged to
      // has to be on screen before anything is changed.
      preselected: row?.classIds ? row.classIds.split(',').filter(Boolean) : undefined,
      note: 'Unticking a class stops the fee applying to it. Invoices already raised are not touched.',
      requiredMessage: 'Pick at least one class to bill.',
    },
    fields: [],
    unitAmount: amount,
    cta: 'Allocate to these classes',
    footnote: 'Nothing is billed until you press this.',
    confirm: (total = { pupils: 0, amount: 0 }) => ({
      title: 'Allocate this fee?',
      body: 'Every pupil in the classes ticked is billed at the fee amount. Classes you unticked stop being charged, and invoices already raised are not touched.',
      subject: `${total.pupils} ${total.pupils === 1 ? 'pupil' : 'pupils'} · ${formatNaira(total.amount)} · ${row?.name ?? 'this fee'}`,
      cta: 'Allocate the fee',
      cancel: 'Go back',
    }),
    run: async (values) => {
      const picked = (values.picks as string[] | undefined) ?? []
      await feesService.allocate(String(row?.id ?? ''), {
        departments: picked.map(Number),
      })
      return {
        message: `${row?.name ?? 'The fee'} allocated to ${picked.length} ${picked.length === 1 ? 'class' : 'classes'}`,
      }
    },
    done: (picked) => `Fee allocated to ${picked} ${picked === 1 ? 'class' : 'classes'}`,
  }
}

/**
 * Taking a payment at the counter.
 *
 * `POST /collect-fees/{id}/pay` settles the invoice with no gateway involved,
 * and it insists that `amount + discount` equal the invoice exactly — there is
 * no part payment. So the flow does not ask what was collected: it asks what
 * was waived, and derives the rest. A clerk who could type both could type a
 * pair that does not add up, and would learn that from a 4xx.
 *
 * It always starts from an invoice, because the queue behind it searches by
 * pupil name and registration number: finding the bill is the search, and
 * looking at it before touching money is the point of the screen.
 */
function payment(row?: Row): ActionDef {
  const total = figure(row?.total)

  return {
    kicker: 'Finance · Fee collection',
    title: 'Take a payment',
    description:
      'Record money collected over the counter. The invoice is settled in full, less any discount granted — there is no part payment and no undoing it from here.',
    summary: [
      { label: 'Pupil', value: row?.student ?? DASH },
      { label: 'Reg. no.', value: row?.regno ?? DASH },
      { label: 'Fee', value: row?.fee ?? DASH },
      { label: 'Invoice', value: formatNaira(total) },
    ],
    fields: [
      {
        key: 'payment_method',
        label: 'How it was paid',
        required: true,
        optionsFrom: 'payment-methods',
        hint: 'The school\'s own list, not a fixed one.',
      },
      {
        key: 'discount',
        label: 'Discount granted (₦)',
        money: true,
        placeholder: '0',
        hint: 'Leave empty to collect the invoice in full.',
      },
      {
        key: 'notes',
        label: 'Note',
        wide: true,
        multiline: true,
        placeholder: 'Transfer ref 99881',
        hint: 'The teller number or transfer reference. Kept on the payment.',
      },
    ],
    // What the clerk will actually take, recomputed as the discount is typed.
    tally: (values) => {
      const { amount, discount } = collecting(total, values.discount)
      return [
        { label: 'Discount', value: formatNaira(discount) },
        { label: 'To collect', value: formatNaira(amount) },
      ]
    },
    cta: 'Record payment',
    footnote: 'Nothing is collected until you press this.',
    confirm: (_total, values) => {
      const { amount, discount } = collecting(total, values?.discount)
      return {
        title: 'Record this payment?',
        body: 'This settles the invoice outright and writes the transaction against your name. There is no undoing it from here.',
        // The pupil, the fee and the figure — the three things a counter
        // checks before the money is committed to the wrong bill.
        subject: [
          row?.student,
          row?.fee,
          formatNaira(amount),
          discount ? `less ${formatNaira(discount)}` : undefined,
        ]
          .filter(Boolean)
          .join(' · '),
        cta: 'Record the payment',
        cancel: 'Go back',
      }
    },
    run: async (values) => {
      const body = paymentBody(total, values)
      const { transaction } = await collectFeesService.pay(String(row?.id ?? ''), body)
      // The API mints the reference, and it is what a parent quotes back when
      // they query the payment, so the toast hands it over rather than the
      // fixed "Payment recorded" a `meta` would give.
      return { message: `Payment recorded — ${transaction.payref}` }
    },
    done: () => 'Payment recorded',
  }
}

async function promote(row?: Row): Promise<ActionDef> {
  const armId = row?.class_arm_id ?? ''
  const from = { departmentId: row?.department_id ?? '' }

  // Everyone in the pupil's own arm, plus anyone admitted into the class but
  // not yet placed — those are exactly the pupils this move can reach.
  const arm = armId
    ? await classArmsService.students(armId).catch(() => undefined)
    : undefined
  const pupils = [...(arm?.students ?? []), ...(arm?.unassigned_in_class ?? [])]
  const names = new Map(pupils.map((pupil) => [pupil.id, pupilName(pupil)]))

  return {
    kicker: 'People · Student register',
    title: 'Promote or transfer pupils',
    description:
      'Pick where these pupils are going. Staying in the class moves them between arms; a different class promotes them. Results and invoices stay attached to the pupil, not the arm.',
    summary: [
      { label: 'From', value: row?.arm ?? DASH },
      { label: 'Class', value: row?.class ?? DASH },
      { label: 'Pupils here', value: String(pupils.length) },
    ],
    picker: {
      title: 'Pupils to move',
      items: pupils.map((pupil) => ({
        key: String(pupil.id),
        label: pupilName(pupil),
        meta: pupil.regno ?? pupil.application_no ?? DASH,
        count: 1,
      })),
      preselected: row?.id ? [row.id] : undefined,
      note: 'Pupils who owe fees can still be moved; the debt follows them.',
      requiredMessage: 'Pick at least one pupil to move.',
    },
    fields: [
      { key: 'department_id', label: 'Move to class', required: true, optionsFrom: 'classes' },
      {
        key: 'class_arm_id',
        label: 'Move to arm',
        required: true,
        optionsFrom: 'arms',
        dependsOn: 'department_id',
        hint: 'The same class means a transfer between arms.',
      },
    ],
    cta: 'Move selected pupils',
    footnote: 'Written to the activity log against your name.',
    done: (picked) => `${picked} ${picked === 1 ? 'pupil moved' : 'pupils moved'}`,
    run: async (values) => {
      const move = studentMove(values as unknown as MoveValues, from)
      const result =
        move.kind === 'transfer'
          ? await classArmsService.assignStudents(move.armId, move.body)
          : await studentsService.promote(move.body).then(() => undefined)

      return moveOutcome(move, result, (id) => names.get(id) ?? `Pupil ${id}`)
    },
  }
}

function review(row?: Row): ActionDef {
  const documents = applicantDocuments(row)
  return {
    kicker: 'People · Applicants',
    title: `Review ${row?.name ?? 'application'}`,
    description:
      'Read the file, then admit into a class arm or decline. An admitted applicant joins the register straight away.',
    summary: [
      { label: 'Reference', value: row?.ref ?? DASH },
      { label: 'Applying to', value: row?.applying ?? DASH },
      { label: 'Submitted', value: row?.submitted ?? DASH },
    ],
    picker: {
      title: 'Documents on file',
      items: documents,
      // A document that was never supplied cannot have been seen.
      preselected: documents.filter((item) => item.count > 0).map((item) => item.key),
      note: 'Tick the documents you have seen and verified.',
    },
    fields: [
      { key: 'decision', label: 'Decision', required: true, options: [ADMIT, 'Decline'] },
      {
        key: 'department_id',
        label: 'Admit into class',
        optionsFrom: 'classes',
        // Opens on the class the family applied for, which is usually the one.
        value: row?.department_id,
        requiredWhen: { field: 'decision', is: ADMIT },
      },
      {
        key: 'class_arm_id',
        label: 'Admit into arm',
        optionsFrom: 'arms',
        dependsOn: 'department_id',
        requiredWhen: { field: 'decision', is: ADMIT },
        hint: 'Arms belong to a class, so pick the class first.',
      },
    ],
    cta: 'Save decision',
    footnote: 'The applicant appears on the student register once admitted.',
    done: () => 'Decision saved',
    run: async (values) => {
      if (!row) throw new Error('That application could not be loaded.')
      const { body, message } = admission(row, values as ReviewValues)
      await studentsService.update(row.id, body)
      return { message }
    },
  }
}

/** The standard loan, and what the due date opens on. */
const LOAN_DAYS = 14

function dueDate(days = LOAN_DAYS): Date {
  const due = new Date()
  due.setDate(due.getDate() + days)
  return due
}

/**
 * Lending a copy to a pupil.
 *
 * The pupil is picked from the admitted register rather than typed, because
 * `POST /admins/books/{id}/lend` is keyed on the pupil's own id and a name
 * would have to be guessed back into one. There is no field for how many
 * copies: the body takes one pupil and one return date, so a loan is a copy.
 */
function lend(row?: Row): ActionDef {
  return {
    kicker: 'School · Library',
    title: `Issue ${row?.title ?? 'book'}`,
    description:
      'Lend a copy to a pupil. Two weeks is the standard loan, and the date can be moved.',
    summary: [
      { label: 'Title', value: row?.title ?? DASH },
      { label: 'Author', value: row?.author ?? DASH },
      { label: 'Copies held', value: row?.copies ?? DASH },
    ],
    fields: [
      {
        key: 'student_id',
        label: 'Pupil',
        required: true,
        wide: true,
        optionsFrom: 'students',
        hint: 'Admitted pupils, listed with their admission number.',
      },
      { key: 'datetoreturn', label: 'Due back', required: true, date: true, value: dueDate() },
    ],
    cta: 'Issue book',
    footnote: 'The copy counts against the library until it is brought back.',
    done: () => 'Book issued',
    run: async (values) => {
      if (!row) throw new Error('That title could not be loaded.')
      const due = toApiDate(values.datetoreturn as Date | undefined)
      if (!due) throw new Error('Pick the date the book is due back.')
      await libraryService.lend(row.id, {
        student_id: Number(values.student_id),
        datetoreturn: due,
      })
      return { message: `${row.title} is out on loan.` }
    },
  }
}

/**
 * Which flow each collection's records enter, keyed by collection id. This is
 * the only place a flow is declared: a collection that is not listed here has
 * no flow and shows no button, so a filtered view of another collection's rows
 * cannot inherit one it has no page for.
 */
/**
 * Placing pupils into an arm.
 *
 * `POST /class-arms/{id}/students` judges each pupil separately and reports
 * what it would not take, so a partial move is a real outcome rather than a
 * failure — the page holds open with the reasons rather than navigating away.
 *
 * The picker offers only `unassigned_in_class`: pupils admitted into this
 * arm's class who are not yet in any arm. A pupil already placed elsewhere is
 * moved from the promote flow, not from here.
 */
async function placePupils(row?: Row): Promise<ActionDef> {
  const armId = String(row?.id ?? '')
  const { unassigned_in_class } = await classArmsService.students(armId)

  return {
    kicker: 'Academics · Class arms',
    title: `Place pupils in ${row?.arm ?? 'this arm'}`,
    description:
      'Pick the pupils to put on this arm’s roll. Only pupils admitted into its class and not yet in any arm are listed.',
    summary: [
      { label: 'Arm', value: row?.arm ?? DASH },
      { label: 'Class', value: row?.klass ?? DASH },
      { label: 'On the roll', value: row?.roll ?? DASH },
    ],
    picker: {
      title: 'Waiting to be placed',
      items: unassigned_in_class.map((pupil) => ({
        key: String(pupil.id),
        label: pupilName(pupil),
        meta: pupil.regno || 'No adm. no. yet',
        count: 1,
      })),
      note:
        unassigned_in_class.length === 0
          ? 'Every pupil admitted into this class is already in an arm.'
          : 'A pupil may only join an arm of their own class. Placing them here puts this arm on their register, their result sheet and their attendance.',
      requiredMessage: 'Pick at least one pupil to place.',
    },
    fields: [],
    cta: 'Place these pupils',
    footnote: 'Nothing moves until you press this.',
    run: async (values) => {
      const picked = (values.picks as string[] | undefined) ?? []
      const { assigned, failed } = await classArmsService.assignStudents(armId, {
        student_ids: picked.map(Number),
      })
      return {
        message: `${assigned.length} ${assigned.length === 1 ? 'pupil' : 'pupils'} placed in ${row?.arm ?? 'the arm'}`,
        failures: failed.map((one) => {
          const pupil = unassigned_in_class.find((each) => each.id === one.student_id)
          return `${pupil ? pupilName(pupil) : `Pupil ${one.student_id}`} — ${one.reason}`
        }),
      }
    },
    done: (picked) => `${picked} ${picked === 1 ? 'pupil' : 'pupils'} placed in the arm`,
  }
}

/**
 * Choosing the classes a subject is taught to.
 *
 * `POST /subjects/{id}/classes` replaces the whole set, so the classes it is
 * already taught to arrive ticked and unticking one is how it is dropped. The
 * home class is kept by the API whether it is listed or not, which is what
 * stops a subject ending up taught to nobody — it is shown ticked and said so.
 */
async function teachTo(row?: Row): Promise<ActionDef> {
  const homeId = String(row?.department_id ?? '')
  const classes = await departmentsService
    .list({ limit: ALL_CLASSES })
    .then((page) => page.items)

  return {
    kicker: 'Academics · Subjects',
    title: `Teach ${row?.name ?? 'this subject'} to`,
    description:
      'Pick every class this subject is taught to. Unticking one drops it; the home class is always kept.',
    summary: [
      { label: 'Subject', value: row?.name ?? DASH },
      { label: 'Home class', value: row?.klass ?? DASH },
      { label: 'Taught to', value: row?.taught ?? DASH },
    ],
    picker: {
      title: 'Classes',
      items: classes.map((department) => ({
        key: String(department.id),
        label: department.name,
        // Most schools code a class differently from its name; this one does
        // not, and repeating "SSS I" beside "SSS I" says nothing.
        meta:
          String(department.id) === homeId
            ? 'Home class'
            : department.deptcode === department.name
              ? ''
              : department.deptcode,
        count: 0,
      })),
      preselected: row?.classIds ? row.classIds.split(',').filter(Boolean) : undefined,
      note: 'The home class stays whether it is ticked or not — a subject can never end up taught to nobody.',
      requiredMessage: 'Pick at least one class.',
    },
    fields: [],
    cta: 'Save these classes',
    footnote: 'Nothing changes until you press this.',
    run: async (values) => {
      const picked = (values.picks as string[] | undefined) ?? []
      await subjectsService.setClasses(String(row?.id ?? ''), {
        classes: picked.map(Number),
      })
      return {
        message: `${row?.name ?? 'The subject'} is taught to ${picked.length} ${picked.length === 1 ? 'class' : 'classes'}`,
      }
    },
    done: (picked) => `Taught to ${picked} ${picked === 1 ? 'class' : 'classes'}`,
  }
}

/**
 * What an administrator can open.
 *
 * There is no privileges catalogue endpoint — `/privileges` is not deployed —
 * so the list of eleven is read off the administrator being edited, which is
 * the only route that carries it. `POST /admins/{id}/privileges` replaces the
 * whole set, so what they already hold arrives ticked and unticking one is how
 * it is taken away.
 */
async function setPrivileges(row?: Row): Promise<ActionDef> {
  const id = parseStaffKey(String(row?.id ?? '')).id
  const { admin, available } = await adminsService.privileges(id)
  const held = (admin.privileges ?? []).map((one) => String(one.id))

  return {
    kicker: 'Staff · Administrators',
    title: `What ${row?.name ?? 'this administrator'} can open`,
    description:
      'Tick every part of the portal this account may use. Unticking one takes it away at once — they stay signed in, but the section closes to them.',
    summary: [
      { label: 'Administrator', value: row?.name ?? DASH },
      { label: 'Account', value: row?.role ?? DASH },
      { label: 'Holds now', value: held.length ? String(held.length) : 'None' },
    ],
    picker: {
      title: 'Privileges',
      items: available.map((privilege) => ({
        key: String(privilege.id),
        label: privilege.name,
        meta: held.includes(String(privilege.id)) ? 'Held now' : '',
        count: 0,
      })),
      preselected: held,
      note: 'Ticking none leaves the account able to sign in and nothing else. It does not delete anything, and it can be put back here.',
    },
    fields: [],
    cta: 'Save these privileges',
    footnote: 'Nothing changes until you press this.',
    run: async (values) => {
      const picked = (values.picks as string[] | undefined) ?? []
      await adminsService.setPrivileges(id, { privileges: picked.map(Number) })
      return {
        message: picked.length
          ? `${row?.name ?? 'The administrator'} holds ${picked.length} ${picked.length === 1 ? 'privilege' : 'privileges'}`
          : `${row?.name ?? 'The administrator'} holds no privileges`,
      }
    },
    done: (picked) =>
      picked ? `${picked} privileges saved` : 'Every privilege was taken away',
  }
}

/**
 * What a teacher is trusted with.
 *
 * `POST /teachers/{id}/subjects` replaces the whole set, so the subjects they
 * already carry arrive ticked and unticking one is how it is taken off them.
 * Every subject comes back with its class expanded, which is the only thing
 * telling two "MATHEMATICS" apart on a register that teaches it to five
 * classes.
 */
async function assignSubjects(row?: Row): Promise<ActionDef> {
  const id = parseStaffKey(String(row?.id ?? '')).id
  const subjects = await subjectsService
    .list({ limit: ALL_SUBJECTS })
    .then((page) => page.items)
  const held = row?.subjectIds ? row.subjectIds.split(',').filter(Boolean) : []

  return {
    kicker: 'Staff · Teachers',
    title: `What ${row?.name ?? 'this teacher'} teaches`,
    description:
      'Tick every subject this teacher carries. Unticking one takes it off them — it stays on the timetable for whoever else teaches it.',
    summary: [
      { label: 'Teacher', value: row?.name ?? DASH },
      { label: 'Class', value: row?.department ?? DASH },
      { label: 'Carries now', value: held.length ? String(held.length) : 'None' },
    ],
    picker: {
      title: 'Subjects',
      items: subjects.map((subject) => ({
        key: String(subject.id),
        // The class, because a school teaches the same subject to several and
        // the name alone would offer the reader five identical rows.
        meta: [subject.department, subject.is_active === false ? 'Inactive' : '']
          .filter(Boolean)
          .join(' · '),
        label: subject.name,
        count: 0,
      })),
      preselected: held,
      note: 'This replaces what they carry. Ticking none leaves them with no subject and no result sheet to enter, which is how a teacher is stood down without deleting them.',
    },
    fields: [],
    cta: 'Save these subjects',
    footnote: 'Nothing changes until you press this.',
    run: async (values) => {
      const picked = (values.picks as string[] | undefined) ?? []
      await teachersService.assignSubjects(id, { subjects: picked.map(Number) })
      const who = row?.name ?? 'The teacher'
      return {
        message: picked.length
          ? `${who} carries ${picked.length} ${picked.length === 1 ? 'subject' : 'subjects'}`
          : `${who} carries no subjects`,
      }
    },
    done: (picked) =>
      picked ? `${picked} ${picked === 1 ? 'subject' : 'subjects'} saved` : 'Every subject was taken off',
  }
}

/**
 * Writing to staff.
 *
 * The endpoint takes logins rather than teaching records — `user_ids`, not
 * teacher ids — so the picker is keyed on the login behind each row. It is
 * opened from one teacher with them already ticked, and anyone else on the
 * register can be added to the same message.
 *
 * At least one is insisted on: the API is documented as mailing every member
 * of staff for an empty list, and a whole-school email is not something to
 * arrive at by unticking the last name on a picker.
 */
async function mailStaff(row?: Row): Promise<ActionDef> {
  const teachers = await teachersService
    .list({ limit: ALL_TEACHERS })
    .then((page) => page.items)

  return {
    kicker: 'Staff · Teachers',
    title: 'Write to staff',
    description:
      'One message, to everyone ticked. It goes to the address each of them signs in with.',
    summary: [
      { label: 'On the register', value: String(teachers.length) },
      { label: 'Opened from', value: row?.name ?? 'The register' },
    ],
    picker: {
      title: 'Who it goes to',
      items: teachers.map((teacher) => ({
        key: String(teacher.user_id),
        label: [teacher.firstname, teacher.middlename, teacher.lastname]
          .filter(Boolean)
          .join(' '),
        meta: teacher.user?.username ?? '',
        count: 1,
      })),
      preselected: row?.user_id ? [row.user_id] : undefined,
      note: 'Everyone ticked gets the same message. There is no draft and no undo — it is sent when you press the button.',
      requiredMessage: 'Pick at least one person to write to.',
    },
    fields: [
      {
        key: 'subject',
        label: 'Subject',
        required: true,
        wide: true,
        placeholder: 'Staff meeting, Friday 3pm',
      },
      {
        key: 'message',
        label: 'Message',
        required: true,
        wide: true,
        multiline: true,
        placeholder: 'What you want them to know.',
      },
    ],
    tally: (values) => {
      const picked = (values.picks as string[] | undefined) ?? []
      return [
        {
          label: 'Going to',
          value: `${picked.length} ${picked.length === 1 ? 'person' : 'people'}`,
        },
      ]
    },
    cta: 'Send this email',
    footnote: 'Sent the moment you press this.',
    confirm: (_total, values) => {
      const picked = (values?.picks as string[] | undefined) ?? []
      return {
        title: 'Send this email?',
        body: 'It leaves the school straight away and cannot be recalled. Check who it is going to and what it says.',
        subject: `${picked.length} ${picked.length === 1 ? 'person' : 'people'} · ${String(values?.subject ?? '').trim() || 'No subject'}`,
        cta: 'Send it',
        cancel: 'Go back',
      }
    },
    run: async (values) => {
      const picked = (values.picks as string[] | undefined) ?? []
      await teachersService.mail({
        user_ids: picked.map(Number),
        subject: String(values.subject ?? '').trim(),
        message: String(values.message ?? '').trim(),
      })
      return {
        message: `Email sent to ${picked.length} ${picked.length === 1 ? 'person' : 'people'}`,
      }
    },
    done: (picked) => `Email sent to ${picked} ${picked === 1 ? 'person' : 'people'}`,
  }
}

/** Both of a teacher's flows, on the mixed register as on their own. */
const isTeacher = (record: Row) => parseStaffKey(record.id).kind === 'teacher'

const teacherFlows: AdminFlow[] = [
  {
    name: 'subjects',
    label: 'Assign subjects',
    when: isTeacher,
    build: assignSubjects,
  },
  { name: 'mail', label: 'Send email', when: isTeacher, build: mailStaff },
]

/**
 * What a batch is, for the two flows below: one subject, for one class, in one
 * term. The four ids that say which are carried in the row's own id, so a
 * batch that cannot be read back is refused rather than acted on — releasing
 * on a half-read key would sign off somebody else's marks.
 */
function batchOf(row?: Row) {
  const key = row && parseBatchId(row.id)
  if (!key) throw new Error('That batch could not be read.')
  return key
}

function batchSummary(row?: Row) {
  return [
    { label: 'Class', value: row?.klass ?? DASH },
    { label: 'Term', value: row?.term ?? DASH },
    { label: 'Marks', value: row?.marks ?? DASH },
  ]
}

const batchSubject = (row?: Row) =>
  [row?.subject, row?.klass, row?.term].filter((part) => part && part !== DASH).join(' · ')

/**
 * Releasing a batch.
 *
 * Confirmed, because this is the moment marks reach families and nothing on
 * this screen takes it back — a released mark is withdrawn one at a time from
 * the results register.
 */
function releaseBatch(row?: Row): ActionDef {
  return {
    kicker: 'Academics · Result approvals',
    title: `Release ${row?.subject ?? 'this batch'}`,
    description:
      'Every mark in this batch goes in front of the pupils and their families. Releasing twice changes nothing, and a mark corrected afterwards comes back into the queue on its own.',
    summary: batchSummary(row),
    fields: [],
    cta: 'Release the batch',
    footnote:
      'Only the office may release a batch, not the teacher who entered it.',
    done: () => 'Batch released',
    confirm: () => ({
      title: 'Release these marks?',
      body: 'Pupils and their families see every mark in this batch, and the grade beside each one, as soon as this goes through. Taking one back afterwards is done a mark at a time from the results register.',
      subject: batchSubject(row),
      cta: 'Release the batch',
      cancel: 'Go back',
    }),
    run: async () => {
      await resultsService.approve(batchOf(row))
      return { message: 'Batch released' }
    },
  }
}

/**
 * Sending a batch back.
 *
 * The reason is required and is stored against every mark in the batch, which
 * is the only thing the teacher has to work from — "sent back" with nothing
 * written on it is a batch nobody knows how to fix.
 */
function sendBatchBack(row?: Row): ActionDef {
  return {
    kicker: 'Academics · Result approvals',
    title: `Send ${row?.subject ?? 'this batch'} back`,
    description:
      'The batch returns to the teacher who filed it, with your reason written against every mark in it. Nothing reaches a family in the meantime.',
    summary: batchSummary(row),
    fields: [
      {
        key: 'reason',
        label: 'What needs fixing',
        required: true,
        multiline: true,
        wide: true,
        placeholder: 'The second CA is missing for half the class.',
        hint: 'Stored against every mark in the batch. This is what the teacher sees.',
      },
    ],
    cta: 'Send it back',
    footnote: 'The batch reappears here once the teacher has filed the corrections.',
    done: () => 'Batch sent back',
    run: async (values) => {
      await resultsService.reject({
        ...batchOf(row),
        reason: String(values.reason ?? '').trim(),
      })
      return { message: 'Batch sent back' }
    },
  }
}

export const adminFlows: Record<string, AdminFlow[]> = {
  fees: [{ name: 'allocate', label: 'Allocate to classes', build: allocate }],
  // Granting and taking away privileges is a super administrator's alone; the
  // API refuses everyone else. And a super administrator's own privileges are
  // not edited from here at all: the account is the school's way back in, and
  // the section that puts a privilege back is one of the ones being taken.
  'staff-admin': [
    {
      name: 'privileges',
      label: 'Set privileges',
      allowed: (record) => superAdminSignedIn() && !isSuperAdminRole(record?.role),
      deniedBody: (record) =>
        isSuperAdminRole(record?.role)
          ? 'A super administrator holds every section of the portal, and that is not edited from here — taking one away could leave the school with no account able to put it back. Their role is what decides it, and the role is changed on the login.'
          : undefined,
      build: setPrivileges,
    },
  ],
  // The mixed register opens teaching records too, and a flow that cannot run
  // against an office record is not offered on one.
  staff: teacherFlows,
  'staff-teachers': teacherFlows,
  // Record-scoped, not `fromList`: a payment needs the invoice it settles,
  // and the queue's own search is how that invoice is found.
  collect: [{ name: 'pay', label: 'Take a payment', when: payAction, build: payment }],
  arms: [{ name: 'place', label: 'Place pupils', build: placePupils }],
  subjects: [{ name: 'classes', label: 'Teach to classes', build: teachTo }],
  students: [{ name: 'move', label: 'Promote or transfer', build: promote }],
  applicants: [{ name: 'review', label: 'Review application', build: review }],
  // Two flows rather than one with a decision box: releasing is the common
  // answer and wants no form at all, and sending back is meaningless without
  // the reason. A batch is read on its own page before either is pressed.
  'result-queue': [
    { name: 'release', label: 'Release the batch', build: releaseBatch },
    { name: 'send-back', label: 'Send it back', build: sendBatchBack },
  ],
  library: [
    {
      name: 'lend',
      label: 'Issue this book',
      // A title the catalogue has taken off lending is not offered; the
      // endpoint would refuse it, and the button should not ask.
      when: (record) => record.isavailable === 'Available',
      build: lend,
    },
  ],
}
