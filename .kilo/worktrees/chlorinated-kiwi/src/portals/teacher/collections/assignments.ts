import type { Assignment, AssignmentBody } from '@/api/set-assignments/types';
import { heldRows } from '@/db/collection';
import { setAssignments, setQuestions, setSubmissions } from '@/db/collections/set-assignments';
import { enqueue } from '@/db/drain';
import { SET, WRITE } from '@/db/ids';
import { DRAWN_STATES, isLocalKey, newLocalKey, type OutboxOp } from '@/db/outbox';
import { outbox } from '@/db/store';
import { BLANK } from '@/features/collections/blank';
import { localFirst } from '@/features/collections/local-first';
import type { CollectionDef, Row } from '@/features/collections/types';
import { needsTeacher, submissionRows } from '../features/assignments/marking';
import { correctAnswer, typeLabel } from '../features/assignments/question';
import { assignmentBody } from './assignment-body';
import { assignmentRows, assignmentTally, editableFields } from './assignment-row';

/**
 * The register reads the device's own set — `setAssignments` in
 * `src/db/collections/set-assignments.ts` — and every write goes through the
 * queue, so an assignment can be set, corrected and deleted with no
 * connection at all. The questions and submissions the record's tabs show
 * come off their own sets the same way.
 */

const mine = async () => assignmentRows(await heldRows(setAssignments));

const tally = () => mine().then(assignmentTally);

/** The assignment's questions, as the record panel's tab lists them. */
const questionRows = async (assignmentId: string): Promise<Row[]> => {
  const questions = (await heldRows(setQuestions)).filter(
    (question) => String(question.assignment_id) === assignmentId,
  );

  return questions.map((question, index) => ({
    id: String(question.id),
    n: String(question.order_number ?? index + 1),
    question: question.question_text?.trim() || `Question ${question.id}`,
    type: typeLabel(question.question_type),
    points: String(question.points ?? 0),
    answer: correctAnswer(question) ?? BLANK,
  }));
};

/**
 * Assignments set on this device that the school has not seen yet. The
 * subject and class are ids in the queued body and their names are not worth
 * a lookup slot here — the title is what the teacher is looking for. A
 * `local:` id is what withholds edit, delete and the questions link until the
 * school issues a real one.
 */
function queuedAssignments(ops: readonly OutboxOp[]): Row[] {
  return ops
    .filter(
      (op) =>
        op.handler === WRITE.createAssignment &&
        DRAWN_STATES.includes(op.state) &&
        typeof op.targetKey === 'string',
    )
    .sort((one, two) => two.seq - one.seq)
    .map((op) => {
      const body = op.payload as AssignmentBody;
      return {
        id: op.targetKey as string,
        title: body.title?.trim() || 'Untitled assignment',
        subject: BLANK,
        klass: BLANK,
        questions: '0',
        closes: BLANK,
        state: 'Waiting to send',
        details: body.details ?? '',
        term: BLANK,
        minutes: body.time_limit ? `${body.time_limit} minutes` : 'No limit',
        pass: body.passing_score == null ? BLANK : `${body.passing_score}%`,
        opens: BLANK,
        opens_at: '',
        closes_at: '',
        locked: '',
        locked_reason: BLANK,
        editable_when_locked: '',
        sat_by: '0',
      };
    });
}

export const assignments: CollectionDef = {
  id: 'assignments',
  path: '/teacher/assignments',
  kicker: 'Assessment',
  title: 'Set assignments',
  description:
    'The assignments you have set, and what each one still needs. Students answer in their own portal once an assignment holds questions and its window opens, and what they send back comes here to be marked.',
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
    // Both ends of the window, because the state alone cannot say which is
    // coming: "Not open yet" and "Open" are answers about different dates, and
    // a teacher checking whether a class can start needs the one that applies.
    { key: 'opens', label: 'Opens' },
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
    { key: 'sat_by', label: 'Handed in' },
    // The school's own sentence, word for word. It explains the refusal and
    // the way round it better than anything written here could, and a teacher
    // quoting it to the office is quoting the office back.
    { key: 'locked_reason', label: 'Locked' },
  ],
  // Writing the questions is a page of its own — a question carries its own
  // choices and its own answer key, which is not a row of a record form.
  // Withheld while the assignment is still queued: a question names the
  // assignment's id, and the school has not issued one yet — one rule instead
  // of a dependency graph, as everywhere else.
  rowLink: {
    label: (row) => (isLocalKey(row.id) ? undefined : 'Questions'),
    to: '/teacher/questions',
    search: (row) => ({ assignment: row.id }),
  },
  tabs: [
    {
      label: 'Questions',
      /*
       * `cardRole` is what a phone reads this by: the tab draws cards under
       * 640px, and without a title named it would head each card with the
       * question's number. The question is the heading and its kind is the
       * line under it; the number, the points and the answer are the
       * label/value pairs beneath.
       */
      columns: [
        { key: 'n', label: '#', align: 'right' },
        { key: 'question', label: 'Question', cardRole: 'title' },
        { key: 'type', label: 'Kind', cardRole: 'subtitle' },
        { key: 'points', label: 'Points', align: 'right' },
        { key: 'answer', label: 'Answer' },
      ],
      source: questionRows,
      empty:
        'This assignment holds no questions yet, so no student can sit it. Write them before its window opens.',
    },
    {
      label: 'Submissions',
      // The pupil heads the card, their number sits under it, and the state is
      // the tag in the corner — the same three roles the submissions register
      // on the marking page already uses.
      columns: [
        { key: 'name', label: 'Student', cardRole: 'title' },
        { key: 'adm', label: 'Adm. no.', cardRole: 'subtitle' },
        { key: 'submitted', label: 'Submitted' },
        { key: 'score', label: 'Score', align: 'right' },
        { key: 'state', label: 'State', tag: true, cardRole: 'tag' },
      ],
      source: async (recordId) => {
        // The paper's own questions decide whether any of this is a teacher's
        // to do: one with nothing but multiple choice on it is settled by its
        // answer key, and calling that "To mark" was work the tab invented.
        const [docs, questions] = await Promise.all([
          heldRows(setSubmissions),
          heldRows(setQuestions),
        ])
        return submissionRows(
          docs.find((doc) => String(doc.id) === recordId)?.submissions ?? [],
          needsTeacher(questions.filter((one) => String(one.assignment_id) === recordId)),
        )
      },
      empty:
        'No student has submitted this assignment yet. Answers appear here as they send them in.',
      // The marking itself is its own page: a written answer is read and given
      // a figure, which is not something a row of a table can be. The row still
      // leads straight to that page with the script already open — the teacher
      // has picked their student by clicking them, and making them pick the
      // same student again on the next page was two clicks that decided nothing.
      rowTo: (recordId, row) => ({
        to: '/teacher/submissions',
        search: { assignment: recordId, submission: row.id },
      }),
      action: (recordId) => ({
        label: 'Mark them all',
        to: '/teacher/submissions',
        search: { assignment: recordId },
      }),
    },
  ],
  collection: localFirst({
    entities: setAssignments,
    // `assignmentRows` sorts for itself — unwritten first, then by newness —
    // which is the order the footer promises; a collection alone would hand
    // the rows back in key order.
    rows: (items: Assignment[]) => assignmentRows(items),
    queued: queuedAssignments,
  }),
  record: async (recordId) => {
    if (isLocalKey(recordId)) {
      return queuedAssignments(outbox().toArray).find((row) => row.id === recordId);
    }
    return (await mine()).find((row) => row.id === recordId);
  },
  queue: async (values, recordId) => {
    if (recordId) {
      // The update body carries a status, and nothing in this portal sets one:
      // the assignment's own is sent back rather than a guess at what it
      // should be — read off the device, which is what lets the correction be
      // queued at all.
      const current = (await heldRows(setAssignments)).find(
        (assignment) => String(assignment.id) === recordId,
      );
      return enqueue({
        handler: WRITE.updateAssignment,
        payload: {
          id: recordId,
          // A paper a class has begun handing in takes only what the school
          // says it takes. Sending the whole body would be refused outright —
          // and refused for changing the questions, which the teacher extending
          // a deadline never touched.
          body: assignmentBody(
            values,
            current?.status ?? undefined,
            current ? editableFields(current) : null,
          ),
        },
        collectionId: SET.teachingAssignments,
        targetKey: recordId,
        toast: { success: 'Assignment saved' },
        label: `Assignment “${String(values.title ?? '').trim() || recordId}”`,
      });
    }
    return enqueue({
      handler: WRITE.createAssignment,
      payload: assignmentBody(values),
      collectionId: SET.teachingAssignments,
      targetKey: newLocalKey(),
      toast: { success: 'Assignment set' },
      label: `Assignment “${String(values.title ?? '').trim() || 'Untitled'}”`,
    });
  },
  queueRemove: (recordId) =>
    enqueue({
      handler: WRITE.removeAssignment,
      payload: recordId,
      collectionId: SET.teachingAssignments,
      targetKey: recordId,
      toast: { success: 'Assignment deleted' },
      label: 'An assignment',
    }),
  removeBody: (row) =>
    `The assignment and its ${row.questions} question${row.questions === '1' ? '' : 's'} go with it. An assignment students have already sat is better left to close than deleted.`,
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
          /*
           * Narrowed by the subject, because a subject belongs to exactly one
           * class: a teacher who takes Home Economics in SSS 3 alone was being
           * offered every class they reach, and three of the four were a 
           * class that does not sit the subject. Answered off the device —
           * `/teachers/me/subjects` expands the class beside each subject — so
           * it costs no request and still works with no connection.
           *
           * Changing the subject clears a class that is not the new subject's,
           * which `RemoteSelectField` does for every dependent feed.
           */
          dependsOn: 'subject_id',
          hint: 'Who sits it — the class that takes the subject you chose. Every student of that class sees the assignment; no other class does.',
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
          required: true,
          /*
           * Withheld on a paper the school has locked, which is one a class
           * has begun handing in: `editable_when_locked` names what it will
           * still take, and the opening date is not on that list. Asking for
           * it anyway would be a compulsory box whose value is dropped on the
           * way out — and on every locked paper on file, which carry no
           * opening date at all, a box the teacher could not fill from the
           * record and could not leave empty. That would block the one change
           * the lock explicitly allows.
           */
          when: (record) =>
            !record?.locked ||
            String(record.editable_when_locked ?? '').split(',').includes('opendate'),
          hint: 'Nobody can start before this.',
        },
        {
          key: 'closes_at',
          label: 'Closes',
          datetime: true,
          required: true,
          // Checked against the box above rather than on its own: a window
          // that shuts before it opens is one nobody can sit, and the school
          // would take it.
          after: 'opens_at',
          hint: 'Nobody can start after this, and a sitting already running is cut short by it.',
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
          hint: 'From the moment a student starts. Leave blank for no limit.',
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
};
