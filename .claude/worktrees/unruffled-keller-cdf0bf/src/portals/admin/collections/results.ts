import { resultsService } from '@/api/results/service'
import type { ApprovalStatus, MarkListParams } from '@/api/results/types'
import { pageRows } from '@/features/collections/api'
import type { CollectionDef, FieldSpec, Row } from '@/features/collections/types'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import {
  batchesOf,
  batchRow,
  correctBody,
  deletable,
  enterBody,
  markRow,
  STATE_LABEL,
} from './result-row'

/** A filter's id as the endpoint wants it; an unset filter is left off. */
function asId(value: string | undefined) {
  return Number(value) || undefined
}

/**
 * A summary figure, asked for as one row and read off the pagination the
 * endpoint returns with it — there is no endpoint that counts without listing.
 */
const countMarks = (params: MarkListParams) => async () =>
  (await resultsService.list({ ...params, limit: 1 })).pagination.total

/**
 * The four parts a mark is entered as.
 *
 * None is required: a school enters the assessments as the term goes and the
 * examination at the end of it, so a mark with only the CAs on it is a normal
 * state and not a half-filled form. What the endpoint does refuse is the four
 * of them summing past 100, which it answers with the arithmetic.
 */
const PARTS: FieldSpec[] = [
  { key: 'first_ca', label: 'First CA', numeric: true },
  { key: 'second_ca', label: 'Second CA', numeric: true },
  { key: 'homework_project', label: 'Homework / project', numeric: true },
  { key: 'first_exam', label: 'Examination', numeric: true },
]

/** What the office may narrow the register by — every one of them optional. */
const STATUSES: { value: ApprovalStatus; label: string }[] = [
  { value: 'pending', label: STATE_LABEL.pending },
  { value: 'approved', label: STATE_LABEL.approved },
  { value: 'rejected', label: STATE_LABEL.rejected },
]

/**
 * Every mark on file, as the office reads and corrects them.
 *
 * The total and the grade are columns here and fields on no form: both are
 * worked out server-side, the grade from the school's own `grade_scales`, and
 * a form that offered either would be offering to overrule the school.
 */
export const results: CollectionDef = {
  id: 'results',
  path: '/admin/results',
  kicker: 'Academics',
  title: 'Results',
  description:
    'Every mark on file, whoever entered it. A mark is one pupil in one subject for one term, and nothing reaches a family until the office releases the batch it belongs to.',
  action: 'Enter a mark',
  searchHint: 'Search pupil, subject or class',
  footer: 'Newest first',
  emptyTitle: 'No marks on file',
  emptyBody:
    'Marks appear here as teachers enter them or upload them. Releasing them to families is done from the approval queue.',
  noun: 'mark',
  nameKey: 'name',
  counts: [
    { label: 'Marks', count: countMarks({}) },
    { label: 'Awaiting release', count: countMarks({ approval_status: 'pending' }) },
    { label: 'Released', count: countMarks({ approval_status: 'approved' }) },
    { label: 'Sent back', count: countMarks({ approval_status: 'rejected' }) },
  ],
  filters: [
    { key: 'department_id', label: 'All classes', optionsFrom: 'classes' },
    {
      key: 'class_arm_id',
      label: 'All arms',
      optionsFrom: 'arms',
      dependsOn: 'department_id',
    },
    { key: 'subject_id', label: 'All subjects', optionsFrom: 'subjects' },
    { key: 'semester_id', label: 'All terms', optionsFrom: 'terms' },
    { key: 'session_id', label: 'All sessions', optionsFrom: 'sessions' },
    { key: 'approval_status', label: 'Any state', options: STATUSES },
  ],
  columns: [
    { key: 'name', label: 'Pupil', cardRole: 'title' },
    { key: 'subject', label: 'Subject', cardRole: 'subtitle' },
    { key: 'klass', label: 'Class' },
    { key: 'term', label: 'Term' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'grade', label: 'Grade' },
    { key: 'state', label: 'State', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'name', label: 'Pupil' },
    { key: 'adm', label: 'Admission no.' },
    { key: 'subject', label: 'Subject' },
    { key: 'klass', label: 'Class' },
    { key: 'term', label: 'Term' },
    { key: 'session', label: 'Session' },
    { key: 'firstCa', label: 'First CA' },
    { key: 'secondCa', label: 'Second CA' },
    { key: 'homework', label: 'Homework / project' },
    { key: 'firstExam', label: 'Examination' },
    { key: 'total', label: 'Total' },
    { key: 'grade', label: 'Grade' },
    { key: 'remark', label: 'Remark' },
    { key: 'state', label: 'State' },
    { key: 'reason', label: 'Sent back because' },
    { key: 'filed', label: 'Filed on' },
    { key: 'by', label: 'Filed by' },
    { key: 'decided', label: 'Released on' },
  ],
  source: async ({ page, q, filters }) => {
    const { items, pagination } = await resultsService.list({
      page,
      limit: PAGE_SIZE,
      q,
      department_id: asId(filters.department_id),
      class_arm_id: asId(filters.class_arm_id),
      subject_id: asId(filters.subject_id),
      semester_id: asId(filters.semester_id),
      session_id: asId(filters.session_id),
      approval_status: (filters.approval_status || undefined) as ApprovalStatus | undefined,
    })
    return { items: items.map(markRow), pagination }
  },
  record: (recordId) => resultsService.get(recordId).then(markRow),
  save: (values, recordId) =>
    recordId
      ? resultsService.correct(recordId, correctBody(values))
      : resultsService.enter(enterBody(values)),
  remove: (recordId) => resultsService.remove(recordId),
  // The API answers 409 for a released mark — it may already be on a report
  // sheet a family has read — so the button is not offered rather than
  // offered and refused. Withdrawing it first puts it back in reach.
  removeWhen: deletable,
  removeBody: (row) =>
    `This deletes ${row.name}’s ${row.subject} mark for ${row.term}. Nothing is kept, and the mark has to be entered again.`,
  rowAction: {
    label: (row) => (row.state === STATE_LABEL.approved ? 'Withdraw' : 'Release'),
    title: (row) =>
      row.state === STATE_LABEL.approved ? 'Withdraw this mark?' : 'Release this mark?',
    confirm: (row) =>
      row.state === STATE_LABEL.approved
        ? 'The pupil and their family stop seeing it at once. It goes back to pending, which is also what makes it deletable again.'
        : `${row.name} and their family will see this mark, and the ${row.grade} beside it, as soon as you do this.`,
    cta: (row) => (row.state === STATE_LABEL.approved ? 'Withdraw it' : 'Release it'),
    done: (row) =>
      row.state === STATE_LABEL.approved
        ? `${row.subject} mark withdrawn`
        : `${row.subject} mark released`,
    run: (row) =>
      resultsService.decide(row.id, {
        status: row.state === STATE_LABEL.approved ? 'pending' : 'approved',
      }),
  },
  form: [
    {
      title: 'The mark',
      fields: [
        {
          key: 'student_id',
          label: 'Pupil',
          required: true,
          optionsFrom: 'students',
          hint: 'Fixed once the mark is filed — a mark against the wrong pupil is deleted, not moved.',
        },
        {
          key: 'subject_id',
          label: 'Subject',
          required: true,
          optionsFrom: 'subjects',
          hint: 'Fixed once the mark is filed, for the same reason.',
        },
        ...PARTS,
      ],
    },
  ],
}

/**
 * The office's queue: batches waiting to be released.
 *
 * A batch is one subject, for one class, in one term — what a teacher enters
 * at a sitting and what the office signs off at a sitting. Nothing here is
 * edited: a batch is released or sent back, and both are flows rather than
 * row buttons because sending one back needs a reason written on it.
 */
export const resultQueue: CollectionDef = {
  id: 'result-queue',
  path: '/admin/result-queue',
  kicker: 'Academics',
  title: 'Result approvals',
  description:
    'Batches of marks waiting on the office. Releasing one puts every mark in it in front of the pupils and their families; sending it back returns it to the teacher with your reason on it.',
  // A batch is not a record anyone edits — it is a decision the office takes.
  readonly: true,
  action: 'Result approvals',
  // The endpoint answers whole and takes no search term.
  searchable: false,
  searchHint: 'Search subject or class',
  footer: 'One batch is one subject, one class, one term',
  emptyTitle: 'Nothing waiting',
  emptyBody:
    'Every batch of marks has been released or sent back. A new one appears here as soon as a teacher files marks, and a corrected mark comes back into the queue on its own.',
  noun: 'batch',
  nameKey: 'subject',
  columns: [
    { key: 'subject', label: 'Subject', cardRole: 'title' },
    { key: 'klass', label: 'Class', cardRole: 'subtitle' },
    { key: 'term', label: 'Term' },
    { key: 'marks', label: 'Marks', align: 'right' },
    { key: 'by', label: 'Filed by' },
    { key: 'filed', label: 'Filed' },
  ],
  detail: [
    { key: 'subject', label: 'Subject' },
    { key: 'klass', label: 'Class' },
    { key: 'arm', label: 'Arm' },
    { key: 'term', label: 'Term' },
    { key: 'session', label: 'Session' },
    { key: 'marks', label: 'Marks in the batch' },
    { key: 'by', label: 'Filed by' },
    { key: 'filed', label: 'Filed' },
  ],
  source: async (params) => pageRows(await queueRows(), params),
  record: async (recordId) => (await queueRows()).find((batch) => batch.id === recordId),
  tabs: [],
}

const queueRows = async (): Promise<Row[]> =>
  batchesOf(await resultsService.pending()).map(batchRow)
