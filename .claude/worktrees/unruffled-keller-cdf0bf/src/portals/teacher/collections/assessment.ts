import { teachingService } from '@/api/teaching/service'
import { pageRows } from '@/features/collections/api'
import type { CollectionDef, Row } from '@/features/collections/types'
import { termFromResults } from '../features/term/term'
import { batchRow, lineRow, parseBatchKey } from './batch-row'
import { myBatches, myMarks, myRoll } from './mine'
import { markRow } from './teaching-row'
import { uploadBody } from './teaching-body'

const batchRows = async (): Promise<Row[]> => (await myBatches()).map(batchRow)

const markRows = async (): Promise<Row[]> => (await myMarks()).items.map(markRow)

export const uploads: CollectionDef = {
  id: 'uploads',
  path: '/teacher/uploads',
  kicker: 'Assessment',
  title: 'Upload batches',
  description:
    'Result files you have uploaded, and whether the office has approved them. A batch is one subject, one class and one term.',
  action: 'Upload CSV / XLSX',
  searchHint: 'Search subject, class or term',
  footer: 'Grouped by subject, class and term',
  emptyTitle: 'Nothing uploaded yet',
  emptyBody:
    'Upload a spreadsheet of marks and the office reads every line before approving it. Marks entered by hand on the score sheet do not appear here.',
  noun: 'batch',
  nameKey: 'subject',
  columns: [
    { key: 'subject', label: 'Subject', cardRole: 'title' },
    { key: 'klass', label: 'Class', cardRole: 'subtitle' },
    { key: 'term', label: 'Term' },
    { key: 'lines', label: 'Lines', align: 'right' },
    { key: 'state', label: 'State', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'subject', label: 'Subject' },
    { key: 'klass', label: 'Class' },
    { key: 'term', label: 'Term' },
    { key: 'session', label: 'Session' },
    { key: 'lines', label: 'Lines' },
    { key: 'state', label: 'State' },
    { key: 'uploaded', label: 'Uploaded' },
  ],
  // The endpoint answers whole and takes no search term.
  source: async (params) => pageRows(await batchRows(), params),
  record: async (recordId) =>
    (await batchRows()).find((batch) => batch.id === String(recordId)),
  save: async (values) => {
    const [roll, marks] = await Promise.all([myRoll(), myMarks()])
    const arm = roll.class_arms.find(
      (one) => String(one.id) === String(values.class_arm_id),
    )
    return teachingService.uploadResults(
      uploadBody(values, arm, termFromResults(marks.items)),
    )
  },
  // Nothing withdraws a batch once it is with the office; a corrected file is
  // uploaded over it.
  form: [
    {
      title: 'The file',
      fields: [
        {
          key: 'result',
          label: 'Results spreadsheet',
          required: true,
          wide: true,
          file: '.csv,.xls,.xlsx',
          hint: 'Column A the admission number, B the CA, then C, D and E the three exam scores. The batch lands with the office as pending.',
        },
        {
          key: 'subject_id',
          label: 'Subject',
          required: true,
          optionsFrom: 'my-subjects',
        },
        {
          key: 'class_arm_id',
          label: 'Arm',
          required: true,
          optionsFrom: 'my-arms',
          hint: 'The class comes with the arm. The term is the one your marks are already filed into.',
        },
      ],
    },
  ],
  tabs: [
    {
      label: 'Lines',
      columns: [
        { key: 'pupil', label: 'Pupil' },
        { key: 'adm', label: 'Adm. no.' },
        { key: 'ca', label: 'CA', align: 'right' },
        { key: 'exam', label: 'Exam', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'grade', label: 'Grade' },
        { key: 'state', label: 'State', tag: true },
      ],
      source: async (recordId) => {
        const key = parseBatchKey(recordId)
        if (!key) return []
        return (await teachingService.uploadBatch(key)).map(lineRow)
      },
      empty: 'The office reads this batch line by line; nothing has come back for it yet.',
    },
  ],
}

export const results: CollectionDef = {
  id: 'results',
  path: '/teacher/results',
  kicker: 'Assessment',
  title: 'Browse results',
  description:
    'Every mark on file in the subjects you teach, whoever recorded it. To change one, open the score sheet under Enter scores.',
  // A mark is corrected on the score sheet, which is where the CA and exam
  // caps are applied; nothing here writes, and no endpoint deletes a mark.
  readonly: true,
  action: 'Browse results',
  searchHint: 'Search pupil, subject, class or grade',
  footer: 'Newest first',
  emptyTitle: 'No marks on file yet',
  emptyBody:
    'Marks appear here once you have entered a score sheet or uploaded a results file, and stay after the office approves them.',
  noun: 'result',
  nameKey: 'name',
  counts: [
    { label: 'Marks', count: async () => (await myMarks()).pagination.total },
    {
      label: 'Pupils',
      count: async () =>
        new Set((await myMarks()).items.map((mark) => mark.student_id)).size,
    },
    {
      label: 'Awaiting approval',
      count: async () =>
        (await myMarks()).items.filter(
          (mark) => mark.approval_status?.trim().toLowerCase() !== 'approved',
        ).length,
    },
  ],
  columns: [
    { key: 'name', label: 'Pupil', cardRole: 'title' },
    { key: 'subject', label: 'Subject', cardRole: 'subtitle' },
    { key: 'klass', label: 'Class' },
    { key: 'ca', label: 'CA', align: 'right' },
    { key: 'exam', label: 'Exam', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'grade', label: 'Grade' },
    { key: 'state', label: 'Approval', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'name', label: 'Pupil' },
    { key: 'adm', label: 'Admission no.' },
    { key: 'subject', label: 'Subject' },
    { key: 'klass', label: 'Class' },
    { key: 'term', label: 'Term' },
    { key: 'ca', label: 'CA' },
    { key: 'exam', label: 'Exam' },
    { key: 'exams', label: 'Exam scores' },
    { key: 'total', label: 'Total' },
    { key: 'grade', label: 'Grade' },
    { key: 'remark', label: 'Remark' },
    { key: 'state', label: 'Approval' },
    { key: 'filed', label: 'Filed on' },
    { key: 'by', label: 'Filed by' },
  ],
  /*
   * Read whole and narrowed here.
   *
   * The endpoint pages and takes `subject_id`, `session_id` and `semester_id`,
   * but it ignores a search term — and finding one pupil is what this page is
   * for. Reading the register whole means the box matches the pupil, the
   * subject, the class, the term and the grade at once, which is every axis a
   * dropdown would have offered and one the API cannot narrow by at all.
   */
  source: async (params) => pageRows(await markRows(), params),
  record: async (recordId) =>
    (await markRows()).find((mark) => mark.id === String(recordId)),
}
