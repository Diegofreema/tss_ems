import type { Quiz, QuizBody } from '@/api/quizzes/types'
import { heldRows } from '@/db/collection'
import {
  teachingQuizRecords,
  teachingQuizSittings,
  teachingQuizzes,
} from '@/db/collections/quizzes'
import { enqueue } from '@/db/drain'
import { SET, WRITE } from '@/db/ids'
import { DRAWN_STATES, isLocalKey, newLocalKey, type OutboxOp } from '@/db/outbox'
import { outbox } from '@/db/store'
import { BLANK } from '@/features/collections/blank'
import { localFirst } from '@/features/collections/local-first'
import type { CollectionDef, Row } from '@/features/collections/types'
import { questionRows } from '../features/quizzes/quiz-question'
import { sittingRows } from '../features/quizzes/sittings'
import { quizBody } from './quiz-body'
import { quizRows, quizTally } from './quiz-row'

/**
 * Quizzes — objective papers that mark themselves the moment a pupil hands
 * one in. Split off assignments on 2026-10-02: an assignment is written work
 * a teacher reads, a quiz is this, and each has its own endpoints.
 *
 * Read off the device and written through the queue, like the assignments
 * register beside it. The questions are written on a page of their own
 * (`/teacher/quiz`), which is also where a quiz is opened to the class.
 */

const mine = async () => quizRows(await heldRows(teachingQuizzes))

const tally = () => mine().then(quizTally)

/** How many have sat it, off the quiz's own record. Above zero, the paper is locked. */
async function satCount(quizId: string): Promise<number> {
  const doc = (await heldRows(teachingQuizRecords)).find((one) => String(one.id) === quizId)
  return Number(doc?.sittings ?? 0)
}

/** Quizzes set on this device that the school has not seen yet. */
function queuedQuizzes(ops: readonly OutboxOp[]): Row[] {
  return ops
    .filter(
      (op) =>
        op.handler === WRITE.createQuiz &&
        DRAWN_STATES.includes(op.state) &&
        typeof op.targetKey === 'string',
    )
    .sort((one, two) => two.seq - one.seq)
    .map((op) => {
      const body = op.payload as QuizBody
      return {
        id: op.targetKey as string,
        name: body.quizname?.trim() || 'Untitled quiz',
        subject: BLANK,
        klass: BLANK,
        arms: body.class_arm_id == null ? 'Every arm' : 'One arm',
        marks: '0',
        clock: body.duration ? `${body.duration} minutes` : 'No clock',
        pass: body.pass_mark == null ? 'None' : `${body.pass_mark}%`,
        asks: body.total_questions ? `${body.total_questions} questions` : 'Every question',
        order: body.shuffle_questions ? 'Shuffled per pupil' : 'As written',
        opens: BLANK,
        closes: BLANK,
        state: 'Waiting to send',
        description: body.description || BLANK,
        sat: '0',
        problem: BLANK,
      }
    })
}

/** Locked once anybody has sat it: the paper is the record of what they were asked. */
const unlocked = (record?: Row) => !record?.locked

export const quizzes: CollectionDef = {
  id: 'quizzes',
  path: '/teacher/quizzes',
  kicker: 'Assessment',
  title: 'Quizzes',
  description:
    'Objective papers that mark themselves the moment a pupil hands one in. Set one as a draft, write its questions, then open it to the class — the class and their guardians are told when you do.',
  action: 'Set a quiz',
  searchHint: 'Search quiz, subject or class',
  footer: 'Drafts first, then what is open, then what is over',
  emptyTitle: 'No quizzes set yet',
  emptyBody:
    'Set a quiz for one of your subjects, write its questions, then open it. A quiz is never open the moment it is made — it has no questions yet.',
  noun: 'quiz',
  nameKey: 'name',
  counts: [
    { label: 'Quizzes set', count: () => tally().then((counted) => counted.quizzes) },
    { label: 'Open now', count: () => tally().then((counted) => counted.open) },
    { label: 'Drafts', count: () => tally().then((counted) => counted.drafts) },
  ],
  columns: [
    { key: 'name', label: 'Quiz', cardRole: 'title' },
    { key: 'subject', label: 'Subject', cardRole: 'subtitle' },
    { key: 'klass', label: 'Class' },
    { key: 'marks', label: 'Marks', align: 'right' },
    { key: 'clock', label: 'Clock' },
    { key: 'closes', label: 'Closes' },
    { key: 'state', label: 'State', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'name', label: 'Quiz' },
    { key: 'description', label: 'Instructions' },
    { key: 'subject', label: 'Subject' },
    { key: 'klass', label: 'Class' },
    { key: 'arms', label: 'Arms' },
    { key: 'marks', label: 'Marks' },
    { key: 'asks', label: 'Each pupil is asked' },
    { key: 'order', label: 'Question order' },
    { key: 'clock', label: 'Time allowed' },
    { key: 'pass', label: 'Pass mark' },
    { key: 'opens', label: 'Opens' },
    { key: 'closes', label: 'Closes' },
    { key: 'state', label: 'State' },
    { key: 'sat', label: 'Sat by' },
    // The school's own sentence, word for word — it names what is missing.
    { key: 'problem', label: 'Before it can open' },
  ],
  // The questions, the answer key and opening it to the class are a page of
  // their own. Withheld while the quiz is still queued: a question names the
  // quiz's id, and the school has not issued one yet.
  rowLink: {
    label: (row) => (isLocalKey(row.id) ? undefined : 'Questions'),
    to: '/teacher/quiz',
    search: (row) => ({ quiz: row.id }),
  },
  tabs: [
    {
      label: 'Questions',
      columns: [
        { key: 'n', label: '#', align: 'right' },
        { key: 'question', label: 'Question', cardRole: 'title' },
        { key: 'kind', label: 'Kind', cardRole: 'subtitle' },
        { key: 'mark', label: 'Mark', align: 'right' },
        { key: 'answer', label: 'Answer' },
      ],
      source: async (recordId) => {
        const doc = (await heldRows(teachingQuizRecords)).find(
          (one) => String(one.id) === recordId,
        )
        return questionRows(doc?.quiz.questions ?? [])
      },
      empty: 'No questions yet, so the class has nothing to sit. Write them, then open the quiz.',
    },
    {
      label: 'Results',
      columns: [
        { key: 'name', label: 'Student', cardRole: 'title' },
        { key: 'adm', label: 'Adm. no.', cardRole: 'subtitle' },
        { key: 'score', label: 'Score', align: 'right' },
        { key: 'percent', label: '%', align: 'right' },
        { key: 'taken', label: 'Time taken' },
        { key: 'verdict', label: 'Result', tag: true, cardRole: 'tag' },
      ],
      source: async (recordId) => {
        const doc = (await heldRows(teachingQuizSittings)).find(
          (one) => String(one.id) === recordId,
        )
        return sittingRows(doc?.sittings ?? [])
      },
      empty:
        'Nobody has sat this quiz yet. A pupil’s mark appears here the moment they hand it in.',
    },
  ],
  collection: localFirst({
    entities: teachingQuizzes,
    rows: (items: Quiz[]) => quizRows(items),
    queued: queuedQuizzes,
  }),
  record: async (recordId) => {
    if (isLocalKey(recordId)) {
      return queuedQuizzes(outbox().toArray).find((row) => row.id === recordId)
    }
    const row = (await mine()).find((one) => one.id === recordId)
    if (!row) return undefined
    const doc = (await heldRows(teachingQuizRecords)).find((one) => String(one.id) === recordId)
    const sat = Number(doc?.sittings ?? 0)
    return {
      ...row,
      sat: String(sat),
      // Read by the form: once a pupil has sat it, what was asked is fixed.
      locked: sat > 0 ? 'yes' : '',
      problem: doc?.publish_problem?.trim() || BLANK,
    }
  },
  queue: async (values, recordId) => {
    if (recordId) {
      const sat = (await satCount(recordId)) > 0
      return enqueue({
        handler: WRITE.updateQuiz,
        payload: { id: recordId, body: quizBody(values, sat) },
        collectionId: SET.teachingQuizzes,
        targetKey: recordId,
        toast: { success: 'Quiz saved' },
        label: `Quiz “${String(values.name ?? '').trim() || recordId}”`,
      })
    }
    return enqueue({
      handler: WRITE.createQuiz,
      payload: quizBody(values),
      collectionId: SET.teachingQuizzes,
      targetKey: newLocalKey(),
      toast: { success: 'Quiz set as a draft — write its questions next' },
      label: `Quiz “${String(values.name ?? '').trim() || 'Untitled'}”`,
    })
  },
  queueRemove: (recordId) =>
    enqueue({
      handler: WRITE.removeQuiz,
      payload: recordId,
      collectionId: SET.teachingQuizzes,
      targetKey: recordId,
      toast: { success: 'Quiz deleted' },
      label: 'A quiz',
    }),
  removeBody: () =>
    'The quiz and its questions go. One a pupil has already sat cannot be deleted — their marks are in it. Close it instead.',
  form: [
    {
      title: 'The quiz',
      fields: [
        { key: 'name', label: 'Name', required: true, wide: true, placeholder: 'Week 4 mental maths' },
        {
          key: 'description',
          label: 'Instructions',
          multiline: true,
          wide: true,
          placeholder: 'Ten minutes, no calculators.',
          hint: 'Read by the class before they start.',
        },
        {
          key: 'subject_id',
          label: 'Subject',
          required: true,
          optionsFrom: 'my-subjects',
          when: unlocked,
          hint: 'One of your own subjects.',
        },
        {
          key: 'department_id',
          label: 'Class',
          required: true,
          optionsFrom: 'my-classes',
          dependsOn: 'subject_id',
          when: unlocked,
          hint: 'The class that takes the subject you chose.',
        },
        {
          key: 'class_arm_id',
          label: 'Arm',
          optionsFrom: 'my-class-arms',
          dependsOn: 'department_id',
          when: unlocked,
          hint: 'Leave empty for every arm of the class.',
        },
      ],
    },
    {
      title: 'When it can be sat',
      fields: [
        {
          key: 'opens_at',
          label: 'Opens',
          datetime: true,
          when: unlocked,
          hint: 'Nobody can start before this. Leave empty to open as soon as you publish it.',
        },
        {
          key: 'closes_at',
          label: 'Closes',
          datetime: true,
          after: 'opens_at',
          hint: 'Nobody can start after this.',
        },
      ],
    },
    {
      title: 'How it is sat',
      // Fixed once anybody has sat it — these are the record of what they
      // were asked — so a locked quiz's form leaves the whole section out.
      fields: [
        {
          key: 'duration',
          label: 'Time allowed (minutes)',
          number: true,
          min: 1,
          when: unlocked,
          hint: 'From the moment a pupil opens the paper. Leave blank for no clock.',
        },
        {
          key: 'pass_mark',
          label: 'Pass mark (%)',
          number: true,
          min: 0,
          max: 100,
          when: unlocked,
          hint: 'A percentage of the marks, not a number of marks.',
        },
        {
          key: 'total_questions',
          label: 'Questions asked',
          number: true,
          min: 1,
          when: unlocked,
          hint: 'Ask only this many of the questions you write — a bank of thirty can be a paper of ten. Leave blank to ask them all.',
        },
        {
          key: 'shuffled',
          label: 'Question order',
          options: [
            { value: 'no', label: 'As written' },
            { value: 'yes', label: 'Shuffled for each pupil' },
          ],
          when: unlocked,
        },
      ],
    },
  ],
}
