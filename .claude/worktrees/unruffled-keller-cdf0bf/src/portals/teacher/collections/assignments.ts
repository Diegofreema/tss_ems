import { setAssignmentKeys } from '@/api/set-assignments/keys'
import { setAssignmentsService } from '@/api/set-assignments/service'
import { pageRows } from '@/features/collections/api'
import { BLANK } from '@/features/collections/blank'
import type { CollectionDef, Row } from '@/features/collections/types'
import { queryClient } from '@/lib/query-client'
import { submissionRows } from '../features/assignments/marking'
import { correctAnswer, typeLabel } from '../features/assignments/question'
import { assignmentBody } from './assignment-body'
import { assignmentRows, assignmentTally } from './assignment-row'

/**
 * ponytail: the whole list at once.
 *
 * The endpoint pages, and a teacher's assignments are counted in tens — so reading
 * them whole is one request either way, and it is what lets the search box
 * match the subject, the class and the state rather than only the fields a
 * query parameter could narrow. A teacher with more assignments than this wants a
 * search term on the endpoint, which it does not have.
 */
const ALL = 200

const mine = () =>
  queryClient
    .ensureQueryData({
      queryKey: setAssignmentKeys.list({ limit: ALL }),
      queryFn: () => setAssignmentsService.list({ limit: ALL }),
    })
    .then((page) => assignmentRows(page.items))

const tally = () => mine().then(assignmentTally)

/** The assignment's questions, as the record panel's tab lists them. */
const questionRows = async (assignmentId: string): Promise<Row[]> => {
  const { questions } = await queryClient.ensureQueryData({
    queryKey: setAssignmentKeys.questions(assignmentId),
    queryFn: () => setAssignmentsService.questions(assignmentId),
  })

  return questions.map((question, index) => ({
    id: String(question.id),
    n: String(question.order_number ?? index + 1),
    question: question.question_text?.trim() || `Question ${question.id}`,
    type: typeLabel(question.question_type),
    points: String(question.points ?? 0),
    answer: correctAnswer(question) ?? BLANK,
  }))
}

export const assignments: CollectionDef = {
  id: 'assignments',
  path: '/teacher/assignments',
  kicker: 'Assessment',
  title: 'Set assignments',
  description:
    'The assignments you have set, and what each one still needs. Pupils answer in their own portal once an assignment holds questions and its window opens, and what they send back comes here to be marked.',
  action: 'Set an assignment',
  searchHint: 'Search assignment, subject or class',
  footer: 'What still needs questions first',
  emptyTitle: 'No assignments set yet',
  emptyBody:
    'Set an assignment for one of your classes, then write its questions. Only the class you set it for ever sees it.',
  noun: 'assignment',
  nameKey: 'title',
  counts: [
    {
      label: 'Assignments set',
      count: () => tally().then((counted) => counted.assignments),
    },
    { label: 'Open now', count: () => tally().then((counted) => counted.open) },
    {
      label: 'Awaiting questions',
      count: () => tally().then((counted) => counted.unwritten),
    },
  ],
  columns: [
    { key: 'title', label: 'Assignment', cardRole: 'title' },
    { key: 'subject', label: 'Subject', cardRole: 'subtitle' },
    { key: 'klass', label: 'Class' },
    { key: 'questions', label: 'Questions', align: 'right' },
    { key: 'closes', label: 'Closes' },
    { key: 'state', label: 'State', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'title', label: 'Assignment' },
    { key: 'details', label: 'Instructions', rich: true },
    { key: 'subject', label: 'Subject' },
    { key: 'klass', label: 'Class' },
    { key: 'term', label: 'Term' },
    { key: 'questions', label: 'Questions' },
    { key: 'minutes', label: 'Time allowed' },
    { key: 'pass', label: 'Pass mark' },
    { key: 'opens', label: 'Opens' },
    { key: 'closes', label: 'Closes' },
    { key: 'state', label: 'State' },
  ],
  // Writing the questions is a page of its own — a question carries its own
  // choices and its own answer key, which is not a row of a record form.
  rowLink: {
    label: () => 'Questions',
    to: '/teacher/questions',
    search: (row) => ({ assignment: row.id }),
  },
  tabs: [
    {
      label: 'Questions',
      columns: [
        { key: 'n', label: '#', align: 'right' },
        { key: 'question', label: 'Question' },
        { key: 'type', label: 'Kind' },
        { key: 'points', label: 'Points', align: 'right' },
        { key: 'answer', label: 'Answer' },
      ],
      source: questionRows,
      empty:
        'This assignment holds no questions yet, so no pupil can sit it. Write them before its window opens.',
    },
    {
      label: 'Submissions',
      columns: [
        { key: 'name', label: 'Pupil' },
        { key: 'adm', label: 'Adm. no.' },
        { key: 'submitted', label: 'Submitted' },
        { key: 'score', label: 'Score', align: 'right' },
        { key: 'state', label: 'State', tag: true },
      ],
      source: async (recordId) =>
        submissionRows(
          (await setAssignmentsService.submissions(recordId)).submissions ?? [],
        ),
      empty:
        'No pupil has submitted this assignment yet. Answers appear here as they send them in.',
      // The marking itself is its own page: a written answer is read and given
      // a figure, which is not something a row of a table can be.
      action: (recordId) => ({
        label: 'Mark the submissions',
        to: '/teacher/submissions',
        search: { assignment: recordId },
      }),
    },
  ],
  source: async (params) => pageRows(await mine(), params),
  record: async (recordId) => (await mine()).find((row) => row.id === recordId),
  save: async (values, recordId) => {
    if (!recordId) return setAssignmentsService.create(assignmentBody(values))
    // The update body carries a status, and nothing in this portal sets one:
    // the assignment's own is sent back rather than a guess at what it should be.
    const current = (await mine()).find((row) => row.id === recordId)
    return setAssignmentsService.update(recordId, assignmentBody(values, current?.status))
  },
  remove: (recordId) => setAssignmentsService.remove(recordId),
  removeBody: (row) =>
    `The assignment and its ${row.questions} question${row.questions === '1' ? '' : 's'} go with it. An assignment pupils have already sat is better left to close than deleted.`,
  form: [
    {
      title: 'The assignment',
      fields: [
        {
          key: 'title',
          label: 'Title',
          required: true,
          wide: true,
          placeholder: 'Mid-term test',
        },
        {
          key: 'details',
          label: 'Instructions',
          rich: true,
          placeholder:
            'Answer all questions. Headings, lists and emphasis are all kept.',
          hint: 'Read by the class before they start.',
        },
        {
          key: 'subject_id',
          label: 'Subject',
          required: true,
          optionsFrom: 'my-subjects',
          hint: 'One of your own subjects.',
        },
        {
          key: 'department_id',
          label: 'Class',
          required: true,
          optionsFrom: 'my-classes',
          hint: 'Who sits it. Every pupil of the class sees the assignment; no other class does.',
        },
      ],
    },
    {
      title: 'How it is sat',
      fields: [
        {
          key: 'time_limit',
          label: 'Time allowed (minutes)',
          number: true,
          min: 1,
          hint: 'From the moment a pupil starts. Leave blank for no limit.',
        },
        {
          key: 'passing_score',
          label: 'Pass mark (%)',
          number: true,
          min: 0,
          max: 100,
          hint: 'A percentage of the marks going, so never more than 100.',
        },
      ],
    },
  ],
}
