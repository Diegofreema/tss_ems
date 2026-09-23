import { teachingService } from '@/api/teaching/service'
import { teacherMarks } from '@/db/collections/teaching'
import { pageRows } from '@/features/collections/api'
import { localFirst } from '@/features/collections/local-first'
import type { CollectionDef, Row } from '@/features/collections/types'
import { resolveMarkingTerm } from '../features/term/use-marking-term'
import { batchRow, lineRow, parseBatchKey } from './batch-row'
import { myArms, myBatches, myMarks, myStudents } from './mine'
import { optionLabels } from '@/features/collections/option-feeds'
import { resultTemplateFile, templateName } from './result-template'
import { newestFirst } from '@/features/collections/order'
import { markRow } from './teaching-row'
import { uploadBody } from './teaching-body'

const batchRows = async (): Promise<Row[]> => (await myBatches()).map(batchRow)

const markRows = async (): Promise<Row[]> => (await myMarks()).map(markRow)

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
    const [arms, marks] = await Promise.all([myArms(), myMarks()])
    const arm = arms.find((one) => String(one.id) === String(values.class_arm_id))
    // The same term the score sheet files into, read the same way: the
    // teacher's own marks first, and the school's register for a teacher who
    // has none. Without the second reading a teacher could never upload their
    // first batch, which is every teacher in their first term here.
    return teachingService.uploadResults(
      uploadBody(values, arm, await resolveMarkingTerm(marks)),
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
          /*
           * The office reads this file by column position, and a sheet with
           * the right words in the wrong order files exam marks as CA. So the
           * shape is handed over rather than described — and handed over with
           * the arm's own registration numbers already in it, which is the
           * other half of what goes wrong: a number typed by hand that matches
           * no student is a line the office throws away.
           */
          template: {
            label: 'Download the template',
            note: 'An Excel workbook with the columns the office reads. The registration numbers of the arm you pick are already filled in — type the marks beside them and upload it back.',
            build: async (values) => {
              const armId = String(values.class_arm_id ?? '')
              const students = await myStudents()
              const roll = armId
                ? students.filter((one) => String(one.class_arm_id) === armId)
                : []
              // Named for what was chosen, so a teacher with three of these in
              // their downloads can tell them apart.
              const [subjects, arms] = await Promise.all([
                optionLabels('my-subjects'),
                optionLabels('my-arms'),
              ])
              return {
                file: await resultTemplateFile(
                  roll.map((one) => one.regno ?? '').filter(Boolean),
                ),
                filename: templateName(
                  subjects.get(String(values.subject_id ?? '')),
                  arms.get(armId),
                ),
              }
            },
          },
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
        { key: 'student', label: 'Student' },
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
  searchHint: 'Search student, subject, class or grade',
  footer: 'Newest first',
  emptyTitle: 'No marks on file yet',
  emptyBody:
    'Marks appear here once you have entered a score sheet or uploaded a results file, and stay after the office approves them.',
  noun: 'result',
  nameKey: 'name',
  counts: [
    { label: 'Marks', count: async () => (await myMarks()).length },
    {
      label: 'Students',
      count: async () =>
        new Set((await myMarks()).map((mark) => mark.student_id)).size,
    },
    {
      label: 'Awaiting approval',
      count: async () =>
        (await myMarks()).filter(
          (mark) => mark.approval_status?.trim().toLowerCase() !== 'approved',
        ).length,
    },
  ],
  columns: [
    { key: 'name', label: 'Student', cardRole: 'title' },
    { key: 'subject', label: 'Subject', cardRole: 'subtitle' },
    { key: 'klass', label: 'Class' },
    { key: 'ca', label: 'CA', align: 'right' },
    { key: 'exam', label: 'Exam', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'grade', label: 'Grade' },
    { key: 'state', label: 'Approval', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'name', label: 'Student' },
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
   * Read off the device, whole, and narrowed here.
   *
   * The endpoint pages and takes `subject_id`, `session_id` and `semester_id`,
   * but it ignores a search term — and finding one student is what this page is
   * for. Reading the register whole means the box matches the student, the
   * subject, the class, the term and the grade at once, which is every axis a
   * dropdown would have offered and one the API cannot narrow by at all.
   *
   * Newest first is stated rather than inherited. A collection is keyed, so the
   * order the endpoint sent the register in is gone by the time it is drawn,
   * and every stamp a mark carries is null across this deployment; see
   * `order.ts`.
   */
  collection: localFirst({
    entities: teacherMarks,
    rows: (marks) => newestFirst(marks, (mark) => mark.uploaddate).map(markRow),
  }),
  source: async (params) => pageRows(await markRows(), params),
  record: async (recordId) =>
    (await markRows()).find((mark) => mark.id === String(recordId)),
}
