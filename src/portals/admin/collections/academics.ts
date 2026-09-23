import { classArmsService } from '@/api/class-arms/service'
import type { ClassArm } from '@/api/class-arms/types'
import { departmentsService } from '@/api/departments/service'
import type { Department } from '@/api/departments/types'
import { subjectsService } from '@/api/subjects/service'
import type { Subject } from '@/api/subjects/types'
import { heldRows } from '@/db/collection'
import { BLANK } from '@/features/collections/blank'
import { refArms, refClassCensus, refClasses, refSubjects } from '@/db/collections/reference'
import { enqueue } from '@/db/drain'
import { SET, WRITE } from '@/db/ids'
import { DRAWN_STATES, isLocalKey, newLocalKey, type OutboxOp } from '@/db/outbox'
import { outbox } from '@/db/store'
import { localFirst } from '@/features/collections/local-first'
import { byId } from '@/features/collections/order'
import { timetablesService } from '@/api/timetables/service'
import { weekPeriods } from '@/features/timetable/week'
import type { CollectionDef, Row } from '@/features/collections/types'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { byClassAndStatus } from './narrow'
import { pendingSubjectStatus, withPendingSubjectStatus } from './pending-state'
import { armBody, subjectBody } from './academics-body'
import { classPeriodRow } from './period-row'
import {
  armDeleteBody,
  armStudentRow,
  armRow,
  subjectClassRow,
  subjectDeleteBody,
  subjectRow,
  subjectTeacherRow,
  withdrawAction,
} from './academics-row'
import {
  census,
  classArmRow,
  classBody,
  classCounts,
  classDeleteBody,
  classRow,
  classSubjectRow,
} from './class-row'

/** The three words `class_arms.status` accepts, as the register shows them. */
const ARM_STATUSES = ['Active', 'Inactive', 'Archived'] as const

/** `subjects.status` is a number: 1 is offered, 0 is withdrawn. */
const SUBJECT_STATUSES = ['Active', 'Inactive'] as const

function asId(value: string | undefined) {
  return Number(value) || undefined
}

/*
 * Counted off the device, like the registers below, so the figures above a list
 * and the list itself can never disagree — and so both still read with no
 * connection. The whole catalogue is stored, withdrawn subjects and archived
 * arms included, so a count of one kind is a filter rather than a request.
 */
const countSubjects = (status?: 0 | 1) => async () => {
  const all = await heldRows(refSubjects)
  if (status === undefined) return all.length

  // The queue counts too. A register showing one subject withdrawn under a
  // tile reading "Withdrawn 0" would be disagreeing with itself in the same
  // eyeful, and the row is the one the office just pressed.
  const queued = pendingSubjectStatus(outbox().toArray)
  const offered = (subject: { id: number; status?: unknown }) =>
    queued.get(String(subject.id)) ?? Number(subject.status) === 1

  return all.filter((subject) => offered(subject) === (status === 1)).length
}

const countArms = (status?: 'active' | 'inactive' | 'archived') => async () => {
  const all = await heldRows(refArms)
  return status === undefined
    ? all.length
    : all.filter((arm) => String(arm.status).toLowerCase() === status).length
}

/**
 * Arms and subjects written on this device that the school has not seen.
 *
 * Each carries the `local:` key the device gave it, which keeps it read-only —
 * and, for a subject, keeps it from being withdrawn before the school knows it
 * exists.
 */
function queuedAcademic(
  ops: readonly OutboxOp[],
  handler: string,
  build: (body: Record<string, unknown>) => Omit<Row, 'id'>,
): Row[] {
  return ops
    .filter(
      (op) =>
        op.handler === handler &&
        DRAWN_STATES.includes(op.state) &&
        typeof op.targetKey === 'string',
    )
    .sort((one, two) => two.seq - one.seq)
    .map((op) => ({
      id: op.targetKey as string,
      ...build(op.payload as Record<string, unknown>),
    }))
}

/**
 * A cell on a queued row. Blank where the school has not filled it in yet reads
 * as a column that failed to load; the dash the rest of the register uses says
 * "not yet" instead. A subject's code is the case in point — the school
 * generates it from the name, so nothing on this device can know it.
 */
const cell = (value: unknown) => String(value ?? '').trim() || BLANK

/** The plain reading, for a field the form did fill in. */
const text = (value: unknown) => String(value ?? '').trim()

const queuedArms = (ops: readonly OutboxOp[]) =>
  queuedAcademic(ops, WRITE.createArm, (body) => ({
    arm: cell(body.arm_name),
    klass: BLANK,
    teacher: BLANK,
    roll: BLANK,
    status: 'Waiting to send',
    department_id: text(body.department_id),
  }))

/*
 * One queued row per write, and a write may now be several subjects — the
 * create form ticks any number of classes and the school makes one for each.
 *
 * The preview stays a single row, deliberately: the op is one op, its local
 * key is what every unsynced-row guardrail is keyed on, and inventing ids for
 * rows the school has not made yet would hand the office records it cannot
 * open. What lands is the truth, and it arrives as several rows on the next
 * sync. The count is not lost meanwhile — the toast says how many were asked
 * for, and the drain repeats what the school actually made.
 *
 * `klass` is blank for the same reason it always was: with several classes
 * ticked there is no one class to name, and with one the school still has to
 * confirm it.
 */
const queuedSubjects = (ops: readonly OutboxOp[]) =>
  queuedAcademic(ops, WRITE.createSubject, (body) => ({
    code: cell(body.subjectcode),
    name: text(body.name),
    klass: BLANK,
    status: 'Waiting to send',
    department_id: text(body.department_id),
  }))

// Counted off the device like the tiles beside it — it used to ask the
// endpoint for a `pagination.total`, and with no connection sat as a dash
// beside two figures that still answered.
const countClasses = async () => (await heldRows(refClasses)).length

/**
 * What every class holds, in one cached answer.
 *
 * `GET /departments` sends the row alone — no arms, no roll, no subjects — and
 * there is no endpoint that counts them in bulk, so each class is asked for
 * its own detail. The register and the three tiles above it read this same
 * promise, so between them they cost one set of requests rather than two.
 *
 * ponytail: N+1, one request per class. A school's whole register is a single
 * page of a few dozen, run in parallel and cached, so this is cheap where it
 * runs. A school with hundreds of classes wants a counts endpoint instead of a
 * longer loop.
 */
const classCensus = async () => census(await heldRows(refClassCensus))

/**
 * Classes written on this device that the school has not seen.
 *
 * A class holds nothing yet, so its counts read as dashes rather than as
 * zeroes: nought arms is a claim about a class the school has never seen, and
 * nobody has made it.
 */
function queuedClasses(ops: readonly OutboxOp[]): Row[] {
  return ops
    .filter(
      (op) =>
        op.handler === WRITE.createClass &&
        DRAWN_STATES.includes(op.state) &&
        typeof op.targetKey === 'string',
    )
    .sort((one, two) => two.seq - one.seq)
    .map((op) => {
      const body = op.payload as Record<string, unknown>
      return {
        id: op.targetKey as string,
        name: text(body.name) || 'Untitled class',
        code: BLANK,
        arms: BLANK,
        students: BLANK,
        subjectCount: BLANK,
        armCount: BLANK,
      }
    })
}

export const classes: CollectionDef = {
  id: 'classes',
  path: '/admin/classes',
  kicker: 'Academics',
  title: 'Classes & arms',
  description:
    'Every class in the school, what it teaches and who is in it. Open one to see the arms it is split into and the subjects it carries.',
  action: 'Create class',
  searchHint: 'Search class or code',
  footer: 'Class register',
  emptyTitle: 'No classes yet',
  emptyBody:
    'Nothing else can be set up until the school has classes — students, subjects, arms and fees all belong to one.',
  noun: 'class',
  nameKey: 'name',
  // Arms have a register of their own — they are created, given a form
  // teacher and filled with students, which is more than a tab on a class can
  // carry. The class page still lists them; this is the way in to changing one.
  secondaryTo: { to: '/admin/arms', label: 'Class arms' },
  // Counted off the device, from the same detailed set the register draws.
  counts: [
    { label: 'Classes', count: async () => (await classCensus()).totals.classes },
    { label: 'Arms', count: async () => (await classCensus()).totals.arms },
    { label: 'Students', count: async () => (await classCensus()).totals.students },
  ],
  columns: [
    { key: 'name', label: 'Class', cardRole: 'title' },
    { key: 'code', label: 'Code', cardRole: 'subtitle' },
    { key: 'arms', label: 'Arms' },
    { key: 'students', label: 'Students', align: 'right' },
    { key: 'subjectCount', label: 'Subjects', align: 'right' },
  ],
  detail: [
    { key: 'name', label: 'Class' },
    { key: 'code', label: 'Code' },
    { key: 'arms', label: 'Arms' },
    { key: 'students', label: 'Students' },
    { key: 'subjectCount', label: 'Subjects' },
    { key: 'fees', label: 'Fees charged' },
    { key: 'terms', label: 'Terms' },
  ],
  /*
   * Read off the device, counts and all.
   *
   * The register shows how many arms, students and subjects each class holds,
   * and the list endpoint sends none of that — so the set behind this one is
   * the *detailed* classes, asked for once per class and then kept. See
   * `refClassCensus`.
   */
  collection: localFirst({
    entities: refClassCensus,
    rows: (all: Department[]) =>
      byId(all).map((department) => classRow(department, classCounts(department))),
    queued: queuedClasses,
  }),
  source: async ({ page, q }) => {
    const [{ items, pagination }, { counts }] = await Promise.all([
      departmentsService.list({ page, limit: PAGE_SIZE, q }),
      classCensus(),
    ])
    return {
      items: items.map((department) =>
        classRow(department, counts.get(String(department.id))),
      ),
      pagination,
    }
  },
  // The detail endpoint counts what the class holds itself, so the record page
  // does not wait on the census the register built.
  record: async (recordId) => {
    if (isLocalKey(recordId)) {
      return queuedClasses(outbox().toArray).find((row) => row.id === recordId)
    }
    const department = await departmentsService.get(recordId)
    return classRow(department, classCounts(department))
  },
  queue: (values, recordId) => {
    const body = classBody(values)
    const named = text(body.name) || 'Untitled class'
    if (recordId) {
      return enqueue({
        handler: WRITE.updateClass,
        payload: { id: recordId, body },
        collectionId: SET.refClassCensus,
        targetKey: recordId,
        toast: { success: 'Class updated' },
        label: `Class “${named}”`,
      })
    }
    return enqueue({
      handler: WRITE.createClass,
      payload: body,
      collectionId: SET.refClassCensus,
      targetKey: newLocalKey(),
      toast: { success: 'Class created' },
      label: `Class “${named}”`,
    })
  },
  // Never forced. `students.department_id` cannot be null, so a class deleted
  // out from under its students leaves them unable to load anywhere that joins
  // their class — the API's refusal is the right answer, not an obstacle.
  queueRemove: (recordId) =>
    enqueue({
      handler: WRITE.removeClass,
      payload: recordId,
      collectionId: SET.refClassCensus,
      targetKey: recordId,
      toast: { success: 'Class deleted' },
      label: 'A class',
    }),
  removeBody: classDeleteBody,
  tabs: [
    {
      label: 'Arms',
      columns: [
        { key: 'arm', label: 'Arm' },
        { key: 'description', label: 'Description' },
        { key: 'teacher', label: 'Form teacher' },
        { key: 'roll', label: 'Students', align: 'right' },
        { key: 'status', label: 'Status', tag: true },
      ],
      source: async (recordId) =>
        (await departmentsService.classArms(recordId)).map(classArmRow),
      empty: 'This class has not been split into arms yet.',
    },
    {
      label: 'Subjects',
      columns: [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Subject' },
        { key: 'status', label: 'Status', tag: true },
      ],
      source: async (recordId) =>
        (await departmentsService.subjects(recordId)).map(classSubjectRow),
      empty: 'No subject is taught to this class yet.',
    },
    {
      // The week the class actually sits, off `GET /timetables/class/{id}` —
      // the same grid the students in it read. The class does not own its
      // periods, so the tab shows them and hands the office to the register
      // where they are kept, already narrowed to this class.
      label: 'Timetable',
      columns: [
        { key: 'day', label: 'Day' },
        { key: 'time', label: 'Time' },
        { key: 'subject', label: 'Subject' },
        // The grid resolves its own staff, so the class's week names them
        // without a second request. Two teachers to a period is ordinary here.
        { key: 'teachers', label: 'Taken by' },
      ],
      source: async (recordId) =>
        weekPeriods(await timetablesService.forClass(recordId)).map(classPeriodRow),
      empty: 'No timetable has been entered for this class yet.',
      action: (recordId) => ({
        label: 'Edit timetable',
        to: '/admin/timetable',
        search: { department_id: recordId },
      }),
    },
  ],
  form: [
    {
      title: 'Class',
      fields: [
        {
          key: 'name',
          label: 'Name',
          required: true,
          wide: true,
          placeholder: 'JSS 1',
          hint: 'How the class reads everywhere in the school — on a student, an invoice, a result. The class code is generated from it.',
        },
      ],
    },
    {
      title: 'What the class carries',
      fields: [
        {
          key: 'fee_ids',
          label: 'Fees charged',
          optionsFrom: 'fees',
          multi: true,
          hint: 'Every student in the class is billed these. Unticking one stops it being charged; invoices already raised are not touched.',
        },
        {
          key: 'subject_ids',
          label: 'Subjects taught',
          optionsFrom: 'subjects',
          multi: true,
          hint: 'Adding a subject here does not move its home class. Unticking one takes it off this class only.',
        },
      ],
    },
  ],
}

export const arms: CollectionDef = {
  id: 'arms',
  path: '/admin/arms',
  kicker: 'Academics',
  title: 'Class arms',
  description:
    'The teachable groups inside each class. An arm has one form teacher and one roll, and it is what a register, a result sheet and a timetable are actually about.',
  action: 'Create arm',
  searchHint: 'Search arm, class or description',
  footer: 'Arm register',
  emptyTitle: 'No arms yet',
  emptyBody:
    'A class needs at least one arm before students can be placed, attendance taken or results uploaded against it.',
  noun: 'arm',
  nameKey: 'arm',
  secondaryTo: { to: '/admin/classes', label: 'Classes' },
  counts: [
    { label: 'Arms', count: countArms() },
    { label: 'Active', count: countArms('active') },
    { label: 'Archived', count: countArms('archived') },
  ],
  columns: [
    { key: 'arm', label: 'Arm', cardRole: 'title' },
    { key: 'klass', label: 'Class', cardRole: 'subtitle' },
    { key: 'teacher', label: 'Form teacher' },
    { key: 'roll', label: 'Students', align: 'right' },
    { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'arm', label: 'Arm' },
    { key: 'klass', label: 'Class' },
    { key: 'teacher', label: 'Form teacher' },
    { key: 'roll', label: 'Students' },
    { key: 'results', label: 'Results recorded' },
    { key: 'attendance', label: 'Attendance records' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
  ],
  filters: [
    { key: 'department_id', label: 'All classes', optionsFrom: 'classes' },
    { key: 'status', label: 'Any status', options: ARM_STATUSES },
  ],
  /*
   * Read off the device. A school has arms in the dozens and the whole set is
   * already here for every form's arm dropdown, so the register reads the same
   * copy — which also means the search box matches every column rather than
   * the one field the endpoint's `q` narrows by.
   */
  collection: localFirst({
    entities: refArms,
    rows: (all: ClassArm[]) => byId(all).map(armRow),
    narrow: byClassAndStatus,
    queued: queuedArms,
  }),
  source: async ({ page, q, filters }) => {
    // Both the class and the form teacher arrive expanded on the row, so this
    // is one request — no name feeds to wait on.
    const { items, pagination } = await classArmsService.list({
      page,
      limit: PAGE_SIZE,
      q,
      department_id: asId(filters.department_id),
      status: filters.status
        ? (filters.status.toLowerCase() as 'active' | 'inactive' | 'archived')
        : undefined,
    })
    return { items: items.map(armRow), pagination }
  },
  record: async (recordId) =>
    isLocalKey(recordId)
      ? queuedArms(outbox().toArray).find((row) => row.id === recordId)
      : classArmsService.get(recordId).then(armRow),
  queue: (values, recordId) => {
    const body = armBody(values)
    const named = text(body.arm_name) || 'Untitled arm'
    if (recordId) {
      return enqueue({
        handler: WRITE.updateArm,
        payload: { id: recordId, body },
        collectionId: SET.refArms,
        targetKey: recordId,
        toast: { success: 'Arm updated' },
        label: `Arm “${named}”`,
      })
    }
    return enqueue({
      handler: WRITE.createArm,
      payload: body,
      collectionId: SET.refArms,
      targetKey: newLocalKey(),
      toast: { success: 'Arm created' },
      label: `Arm “${named}”`,
    })
  },
  // Never forced. Forcing leaves results and attendance pointing at an arm
  // that is gone; archiving is the way to take an arm out of use, and the
  // confirm says so.
  queueRemove: (recordId) =>
    enqueue({
      handler: WRITE.removeArm,
      payload: recordId,
      collectionId: SET.refArms,
      targetKey: recordId,
      toast: { success: 'Arm deleted' },
      label: 'An arm',
    }),
  removeBody: armDeleteBody,
  tabs: [
    {
      label: 'Students',
      columns: [
        { key: 'name', label: 'Student' },
        { key: 'adm', label: 'Adm. no.' },
        { key: 'placed', label: 'Placement', tag: true },
        { key: 'status', label: 'Status', tag: true },
      ],
      // Students admitted into the class but not yet placed are listed too —
      // they are exactly who this arm can still take — and marked as such, so
      // the tab is not read as a roll of students who are already here.
      source: async (recordId) => {
        const { students, unassigned_in_class } = await classArmsService.students(recordId)
        return [
          ...students.map((student) => armStudentRow(student, true)),
          ...unassigned_in_class.map((student) => armStudentRow(student, false)),
        ]
      },
      empty: 'No student has been placed in this arm yet.',
    },
  ],
  form: [
    {
      title: 'Arm',
      fields: [
        {
          key: 'arm_name',
          label: 'Arm name',
          required: true,
          placeholder: 'JSS1 A',
          hint: 'Up to 10 characters, and unique within the class.',
        },
        { key: 'department_id', label: 'Class', required: true, optionsFrom: 'classes' },
        { key: 'class_teacher_id', label: 'Form teacher', optionsFrom: 'teachers' },
        { key: 'armstatus', label: 'Status', options: ARM_STATUSES },
        {
          key: 'arm_description',
          label: 'Description',
          multiline: true,
          wide: true,
          placeholder: 'Morning stream',
        },
      ],
    },
  ],
}

export const subjects: CollectionDef = {
  id: 'subjects',
  path: '/admin/subjects',
  kicker: 'Academics',
  title: 'Subjects',
  description:
    'The subject register. Every subject has one home class it can never stop being taught to, and any number of others it is also taught to.',
  action: 'Create subject',
  searchHint: 'Search subject or code',
  footer: 'Subject register',
  emptyTitle: 'No subjects yet',
  emptyBody: 'Create a subject before assigning it to classes and teachers.',
  noun: 'subject',
  nameKey: 'name',
  counts: [
    { label: 'Offered', count: countSubjects(1) },
    { label: 'Withdrawn', count: countSubjects(0) },
    { label: 'Classes', count: countClasses },
  ],
  // The list expands neither the classes a subject is taught to nor its
  // teachers, so neither is a column — a column blank on every row reads as
  // data that failed to load. Both are on the record, where they are sent.
  columns: [
    { key: 'code', label: 'Code', cardRole: 'subtitle' },
    { key: 'name', label: 'Subject', cardRole: 'title' },
    { key: 'klass', label: 'Home class' },
    { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'name', label: 'Subject' },
    { key: 'code', label: 'Code' },
    { key: 'klass', label: 'Home class' },
    { key: 'taught', label: 'Taught to' },
    { key: 'staff', label: 'Taught by' },
    { key: 'term', label: 'Term' },
    { key: 'status', label: 'Status' },
  ],
  filters: [
    { key: 'department_id', label: 'All classes', optionsFrom: 'classes' },
    { key: 'status', label: 'Any status', options: SUBJECT_STATUSES },
  ],
  /*
   * Withdrawing a subject, or putting it back, through the queue.
   *
   * The op says which state the subject should end in rather than "toggle", so
   * a replay leaves it where the office meant it — a toggle sent twice is a
   * toggle undone.
   */
  rowAction: {
    ...withdrawAction,
    queueRun: (row) =>
      enqueue({
        handler: WRITE.setSubjectStatus,
        payload: { id: row.id, offered: row.status !== 'Active' },
        collectionId: SET.refSubjects,
        targetKey: row.id,
        toast: {
          success: row.status === 'Active' ? 'Subject withdrawn' : 'Subject offered again',
        },
        label: `Subject “${row.name}”`,
      }),
  },
  // Read off the device, like the arms above and for the same reasons.
  collection: localFirst({
    entities: refSubjects,
    rows: (all: Subject[]) => byId(all).map(subjectRow),
    narrow: byClassAndStatus,
    queued: queuedSubjects,
    // A queued withdrawal shows on the row it is about, so the button is not a
    // button that appears to do nothing.
    overlay: withPendingSubjectStatus,
  }),
  source: async ({ page, q, filters }) => {
    const { items, pagination } = await subjectsService.list({
      page,
      limit: PAGE_SIZE,
      q,
      department_id: asId(filters.department_id),
      // The endpoint takes 1 or 0, and no filter at all means both.
      status: filters.status ? (filters.status === 'Active' ? 1 : 0) : undefined,
    })
    return { items: items.map(subjectRow), pagination }
  },
  record: async (recordId) =>
    isLocalKey(recordId)
      ? queuedSubjects(outbox().toArray).find((row) => row.id === recordId)
      : subjectsService.get(recordId).then(subjectRow),
  queue: (values, recordId) => {
    const body = subjectBody(values)
    const named = text(body.name) || 'Untitled subject'
    if (recordId) {
      return enqueue({
        handler: WRITE.updateSubject,
        payload: { id: recordId, body },
        collectionId: SET.refSubjects,
        targetKey: recordId,
        toast: { success: 'Subject updated' },
        label: `Subject “${named}”`,
      })
    }
    // One class ticked or five, the office is told which it got — a form that
    // says "Subject created" after making five is a form nobody trusts twice.
    const made = body.department_ids?.length ?? 1
    return enqueue({
      handler: WRITE.createSubject,
      payload: body,
      collectionId: SET.refSubjects,
      targetKey: newLocalKey(),
      toast: { success: made > 1 ? `${made} subjects created` : 'Subject created' },
      label: made > 1 ? `Subject “${named}” for ${made} classes` : `Subject “${named}”`,
    })
  },
  // Never forced: forcing leaves results, materials and topics pointing at a
  // subject that is gone. Withdrawing is how a subject stops being offered.
  queueRemove: (recordId) =>
    enqueue({
      handler: WRITE.removeSubject,
      payload: recordId,
      collectionId: SET.refSubjects,
      targetKey: recordId,
      toast: { success: 'Subject deleted' },
      label: 'A subject',
    }),
  removeBody: subjectDeleteBody,
  tabs: [
    {
      label: 'Classes',
      columns: [
        { key: 'name', label: 'Class' },
        { key: 'role', label: 'Role', tag: true },
      ],
      source: async (recordId) =>
        (await subjectsService.get(recordId)).classes?.map(subjectClassRow) ?? [],
      empty: 'Only its home class takes this subject.',
    },
    {
      label: 'Teachers',
      columns: [{ key: 'name', label: 'Teacher' }],
      source: async (recordId) =>
        (await subjectsService.get(recordId)).teachers?.map(subjectTeacherRow) ?? [],
      empty: 'Nobody carries this subject yet.',
    },
  ],
  form: [
    {
      title: 'Subject',
      fields: [
        {
          key: 'name',
          label: 'Name',
          required: true,
          wide: true,
          placeholder: 'Mathematics',
          hint: 'Unique within its class. The subject code is generated from it.',
        },
        /*
         * Creating: which classes take it, and one subject is made per class.
         *
         * That is the school's own arithmetic rather than a convenience here —
         * `department_ids` answers `created: 3` for three classes and names
         * each row after its class ("Mathematics - JSS I"). A registrar
         * setting a term up types the name once instead of five times.
         *
         * Editing shows the singular field below instead: a subject that
         * already exists has one home class, and turning it into three
         * subjects is not an edit. Moving it between classes is what that
         * field does, and teaching it to *more* classes without duplicating it
         * is the "Teach to classes" flow on the record.
         */
        {
          key: 'department_ids',
          label: 'Classes',
          required: true,
          multi: true,
          wide: true,
          optionsFrom: 'classes',
          when: (record) => !record,
          hint: 'One subject is created for each class ticked, and the school adds the class to its name. Each can never stop being taught to the class it was made for.',
        },
        {
          key: 'department_id',
          label: 'Home class',
          required: true,
          optionsFrom: 'classes',
          when: (record) => Boolean(record),
          hint: 'The class it can never stop being taught to. To teach it to others as well, use “Teach to classes” on the record.',
        },
      ],
    },
    {
      title: 'Who teaches it',
      fields: [
        {
          key: 'teacher_ids',
          label: 'Teachers',
          optionsFrom: 'teachers',
          multi: true,
          hint: 'Anyone ticked here can record results and set work for this subject. Unticking a teacher takes it off them; it does not touch the results they have already recorded.',
        },
      ],
    },
  ],
}
