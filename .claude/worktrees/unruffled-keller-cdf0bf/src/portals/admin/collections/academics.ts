import { classArmsService } from '@/api/class-arms/service'
import { departmentsService } from '@/api/departments/service'
import { subjectsService } from '@/api/subjects/service'
import { timetablesService } from '@/api/timetables/service'
import { weekPeriods } from '@/features/timetable/week'
import type { CollectionDef } from '@/features/collections/types'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { queryClient } from '@/lib/query-client'
import { armBody, subjectBody } from './academics-body'
import { classPeriodRow } from './period-row'
import {
  armDeleteBody,
  armPupilRow,
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

/** Every class on one page — a school has them in the dozens, not thousands. */
const ALL_CLASSES = 200

function asId(value: string | undefined) {
  return Number(value) || undefined
}

const countSubjects = (status?: 0 | 1) => async () =>
  (await subjectsService.list({ status, limit: 1 })).pagination.total

const countArms = (status?: 'active' | 'inactive' | 'archived') => async () =>
  (await classArmsService.list({ status, limit: 1 })).pagination.total

const countClasses = async () =>
  (await departmentsService.list({ limit: 1 })).pagination.total

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
const classCensus = () =>
  queryClient.ensureQueryData({
    queryKey: ['departments', 'census'],
    queryFn: async () => {
      const { items } = await departmentsService.list({ limit: ALL_CLASSES })
      // A class whose detail fails is kept with the row the list gave, so one
      // bad response costs that class its counts rather than the page.
      const detailed = await Promise.all(
        items.map((department) =>
          departmentsService.get(department.id).catch(() => department),
        ),
      )
      return census(detailed)
    },
  })

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
    'Nothing else can be set up until the school has classes — pupils, subjects, arms and fees all belong to one.',
  noun: 'class',
  nameKey: 'name',
  // Arms have a register of their own — they are created, given a form
  // teacher and filled with pupils, which is more than a tab on a class can
  // carry. The class page still lists them; this is the way in to changing one.
  secondaryTo: { to: '/admin/arms', label: 'Class arms' },
  counts: [
    { label: 'Classes', count: async () => (await classCensus()).totals.classes },
    { label: 'Arms', count: async () => (await classCensus()).totals.arms },
    { label: 'Pupils', count: async () => (await classCensus()).totals.pupils },
  ],
  columns: [
    { key: 'name', label: 'Class', cardRole: 'title' },
    { key: 'code', label: 'Code', cardRole: 'subtitle' },
    { key: 'arms', label: 'Arms' },
    { key: 'pupils', label: 'Pupils', align: 'right' },
    { key: 'subjectCount', label: 'Subjects', align: 'right' },
  ],
  detail: [
    { key: 'name', label: 'Class' },
    { key: 'code', label: 'Code' },
    { key: 'arms', label: 'Arms' },
    { key: 'pupils', label: 'Pupils' },
    { key: 'subjectCount', label: 'Subjects' },
    { key: 'fees', label: 'Fees charged' },
    { key: 'terms', label: 'Terms' },
  ],
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
    const department = await departmentsService.get(recordId)
    return classRow(department, classCounts(department))
  },
  save: (values, recordId) =>
    recordId
      ? departmentsService.update(recordId, classBody(values))
      : departmentsService.create(classBody(values)),
  // Never forced. `students.department_id` cannot be null, so a class deleted
  // out from under its pupils leaves them unable to load anywhere that joins
  // their class — the API's refusal is the right answer, not an obstacle.
  remove: (recordId) => departmentsService.remove(recordId),
  removeBody: classDeleteBody,
  tabs: [
    {
      label: 'Arms',
      columns: [
        { key: 'arm', label: 'Arm' },
        { key: 'description', label: 'Description' },
        { key: 'teacher', label: 'Form teacher' },
        { key: 'roll', label: 'Pupils', align: 'right' },
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
      // the same grid the pupils in it read. The class does not own its
      // periods, so the tab shows them and hands the office to the register
      // where they are kept, already narrowed to this class.
      label: 'Timetable',
      columns: [
        { key: 'day', label: 'Day' },
        { key: 'time', label: 'Time' },
        { key: 'subject', label: 'Subject' },
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
          hint: 'How the class reads everywhere in the school — on a pupil, an invoice, a result. The class code is generated from it.',
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
          hint: 'Every pupil in the class is billed these. Unticking one stops it being charged; invoices already raised are not touched.',
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
    'A class needs at least one arm before pupils can be placed, attendance taken or results uploaded against it.',
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
    { key: 'roll', label: 'Pupils', align: 'right' },
    { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'arm', label: 'Arm' },
    { key: 'klass', label: 'Class' },
    { key: 'teacher', label: 'Form teacher' },
    { key: 'roll', label: 'Pupils' },
    { key: 'results', label: 'Results recorded' },
    { key: 'attendance', label: 'Attendance records' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
  ],
  filters: [
    { key: 'department_id', label: 'All classes', optionsFrom: 'classes' },
    { key: 'status', label: 'Any status', options: ARM_STATUSES },
  ],
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
  record: (recordId) => classArmsService.get(recordId).then(armRow),
  save: (values, recordId) =>
    recordId
      ? classArmsService.update(recordId, armBody(values))
      : classArmsService.create(armBody(values)),
  // Never forced. Forcing leaves results and attendance pointing at an arm
  // that is gone; archiving is the way to take an arm out of use, and the
  // confirm says so.
  remove: (recordId) => classArmsService.remove(recordId),
  removeBody: armDeleteBody,
  tabs: [
    {
      label: 'Pupils',
      columns: [
        { key: 'name', label: 'Pupil' },
        { key: 'adm', label: 'Adm. no.' },
        { key: 'placed', label: 'Placement', tag: true },
        { key: 'status', label: 'Status', tag: true },
      ],
      // Pupils admitted into the class but not yet placed are listed too —
      // they are exactly who this arm can still take — and marked as such, so
      // the tab is not read as a roll of pupils who are already here.
      source: async (recordId) => {
        const { students, unassigned_in_class } = await classArmsService.students(recordId)
        return [
          ...students.map((pupil) => armPupilRow(pupil, true)),
          ...unassigned_in_class.map((pupil) => armPupilRow(pupil, false)),
        ]
      },
      empty: 'No pupil has been placed in this arm yet.',
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
  rowAction: {
    ...withdrawAction,
    run: (row) =>
      row.status === 'Active'
        ? subjectsService.deactivate(row.id)
        : subjectsService.activate(row.id),
  },
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
  record: (recordId) => subjectsService.get(recordId).then(subjectRow),
  save: (values, recordId) =>
    recordId
      ? subjectsService.update(recordId, subjectBody(values))
      : subjectsService.create(subjectBody(values)),
  // Never forced: forcing leaves results, materials and topics pointing at a
  // subject that is gone. Withdrawing is how a subject stops being offered.
  remove: (recordId) => subjectsService.remove(recordId),
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
        {
          key: 'department_id',
          label: 'Home class',
          required: true,
          optionsFrom: 'classes',
          hint: 'The class it can never stop being taught to.',
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
