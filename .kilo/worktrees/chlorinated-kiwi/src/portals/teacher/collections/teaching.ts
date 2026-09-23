import { enqueue } from '@/db/drain';
import { SET, WRITE } from '@/db/ids';
import { newLocalKey } from '@/db/outbox';
import {
  teacherEClasses,
  teacherRoll,
  teacherSubjects,
  teacherTopics,
} from '@/db/collections/teaching';
import { pageRows } from '@/features/collections/api';
import { localFirst } from '@/features/collections/local-first';
import type { CollectionDef, Row } from '@/features/collections/types';
import { myArms, myEClasses, myMarks, myStudents, mySubjects, myTopics } from './mine';
import { byId, newestFirst } from '@/features/collections/order';
import { topicBody, topicUpdate } from './teaching-body';
import {
  eclassRow,
  mySubjectRow,
  studentRow,
  scoreRow,
  subjectNames,
  topicRow,
} from './teaching-row';

const subjectRows = async (): Promise<Row[]> =>
  (await mySubjects()).map(mySubjectRow);

const topicRows = async (): Promise<Row[]> => {
  const [topics, subjects] = await Promise.all([myTopics(), mySubjects()]);
  const names = subjectNames(subjects);
  return topics.map((topic) => topicRow(topic, names));
};

const eclassRows = async (): Promise<Row[]> =>
  (await myEClasses()).map(eclassRow);

const studentRows = async (): Promise<Row[]> =>
  (await myStudents()).map(studentRow);

export const subjects: CollectionDef = {
  id: 'subjects',
  path: '/teacher/subjects',
  /*
   * A page rather than a modal over the register, which it was while the
   * record was five fields and nothing else. It carries the topics taught in
   * it now — the scheme of work is read and written from the subject it
   * belongs to, not from a register of every topic the teacher has ever
   * filed — and a sub-table is the one thing the modal does not draw.
   */
  kicker: 'Teaching',
  title: 'My subjects',
  description:
    'The subjects the school office has put in your hands, and the class each one belongs to.',
  // A teacher is given subjects; they do not take them. Assigning one is the
  // office's own endpoint, so nothing here offers to add, edit or remove.
  readonly: true,
  action: 'My subjects',
  searchHint: 'Search subject, code or class',
  footer: 'Set by the school office',
  emptyTitle: 'No subjects yet',
  emptyBody:
    'Once the school office assigns you a subject it appears here, with the class it is taught to.',
  noun: 'subject',
  nameKey: 'name',
  columns: [
    { key: 'code', label: 'Code', cardRole: 'subtitle' },
    { key: 'name', label: 'Subject', cardRole: 'title' },
    { key: 'klass', label: 'Class' },
    { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'name', label: 'Subject' },
    { key: 'code', label: 'Code' },
    { key: 'klass', label: 'Class' },
    { key: 'status', label: 'Status' },
    { key: 'added', label: 'Given to you' },
  ],
  // Read off the device. The endpoint answers whole and takes no search term,
  // so the page is paged and searched here — which also means the box matches
  // every column.
  collection: localFirst({
    entities: teacherSubjects,
    rows: (given) => byId(given).map(mySubjectRow),
  }),
  source: async (params) => pageRows(await subjectRows(), params),
  // There is no endpoint for one of these, so the record is found in the list
  // the register already asked for.
  record: async (recordId) =>
    (await subjectRows()).find((subject) => subject.id === String(recordId)),
  tabs: [
    {
      label: 'Topics taught',
      /*
       * Panels rather than a table. A topic is a title and the prose under it,
       * and as columns the prose was cut to whatever fitted on one line —
       * which is the half the office actually reads — while the frame scrolled
       * sideways on a phone. Here the title is the heading and the scheme is
       * read where it was written.
       */
      accordion: {
        title: 'title',
        body: 'contents',
        empty: 'This topic was filed without anything written under it.',
        openLabel: 'Open the topic',
      },
      /*
       * Filtered here rather than asked for: `GET /teachers/me/topics` takes
       * no subject, and the whole set is on the device anyway — which is also
       * what lets this tab fill in a classroom with no signal, where a scheme
       * of work is actually written up.
       */
      source: async (recordId) =>
        (await topicRows()).filter((topic) => topic.subject_id === String(recordId)),
      empty: 'Nothing recorded for this subject yet.',
      // A topic is a record, so the panel offers it — there is no register of
      // topics for it to lead to any more.
      rowRecord: (_subjectId, row) => ({ collection: 'topics', recordId: row.id }),
      // The way the scheme is written up at all, now that topics have no
      // register of their own. The subject is the page, so it travels with it.
      add: (recordId) => ({
        label: 'Add topic',
        collection: 'topics',
        values: { subject_id: recordId },
      }),
    },
  ],
};

export const students: CollectionDef = {
  id: 'students',
  path: '/teacher/students',
  kicker: 'Teaching',
  title: 'My students',
  description:
    'Every student in the class you take. Open a student for what the school holds about them and their marks in your subjects.',
  // The office admits students and places them in arms; a teacher reads the roll.
  readonly: true,
  action: 'My students',
  searchHint: 'Search student, admission no. or arm',
  footer: 'The classes you take',
  emptyTitle: 'No students on your roll',
  emptyBody:
    'Students appear here once the office has placed them in an arm you take.',
  noun: 'student',
  nameKey: 'name',
  counts: [
    { label: 'Students', count: async () => (await myStudents()).length },
    // The arms come back beside the roll rather than on it, which is the only
    // way an arm the teacher takes but which holds nobody is counted at all.
    { label: 'Classes', count: async () => (await myArms()).length },
  ],
  columns: [
    { key: 'adm', label: 'Adm. no.', cardRole: 'subtitle' },
    { key: 'name', label: 'Name', cardRole: 'title' },
    { key: 'arm', label: 'Arm' },
    { key: 'klass', label: 'Class' },
    { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'name', label: 'Name' },
    { key: 'adm', label: 'Admission no.' },
    { key: 'arm', label: 'Arm' },
    { key: 'klass', label: 'Class' },
    { key: 'status', label: 'Status' },
    { key: 'gender', label: 'Gender' },
    { key: 'born', label: 'Born' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'father', label: 'Father' },
    { key: 'mother', label: 'Mother' },
    { key: 'enrolled', label: 'On the roll since' },
    { key: 'username', label: 'Signs in with' },
  ],
  // Read off the device. The endpoint pages but ignores a search term, so the
  // roll is read whole and searched here — on every column, not the one field
  // a parameter would have narrowed.
  collection: localFirst({
    entities: teacherRoll,
    rows: (roll) => byId(roll).map(studentRow),
  }),
  source: async (params) => pageRows(await studentRows(), params),
  record: async (recordId) =>
    (await studentRows()).find((student) => student.id === String(recordId)),
  tabs: [
    {
      label: 'Marks in my subjects',
      columns: [
        { key: 'subject', label: 'Subject' },
        { key: 'ca', label: 'CA', align: 'right' },
        { key: 'exam', label: 'Exam', align: 'right' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'grade', label: 'Grade' },
        { key: 'state', label: 'Approval', tag: true },
      ],
      source: async (recordId) => {
        const [marks, subjects] = await Promise.all([myMarks(), mySubjects()]);
        const names = subjectNames(subjects);
        return marks
          .filter((mark) => String(mark.student_id) === String(recordId))
          .map((mark) => scoreRow(mark, names));
      },
      empty:
        'No mark has been recorded for this student in any of your subjects.',
    },
  ],
};

export const topics: CollectionDef = {
  id: 'topics',
  /*
   * Topics have no register of their own. Every topic is taught in a subject,
   * so they are read and written from the subject's own page — the tab above
   * — and this is where a topic's record and its form go back to.
   *
   * The record is a page rather than the modal it used to be for the same
   * reason: a modal is opened over the register a record belongs to, and
   * there is no longer one to open it over.
   */
  path: '/teacher/subjects',
  homeLabel: 'my subjects',
  // Which is also why it needs one of these: `path` is part of the key a
  // collection's rows are cached under, and the subjects share it now.
  scope: 'topics',
  kicker: 'Teaching',
  title: 'Topics taught',
  description:
    'A record of what you have covered, subject by subject. The school office reads this.',
  action: 'Add topic',
  searchHint: 'Search topic or subject',
  footer: 'Your own record of the scheme',
  emptyTitle: 'Nothing recorded yet',
  emptyBody:
    'Record what you cover so the office can follow the scheme. A topic can only be filed under a subject you teach.',
  noun: 'topic',
  nameKey: 'title',
  columns: [
    { key: 'subject', label: 'Subject', cardRole: 'subtitle' },
    { key: 'title', label: 'Topic', cardRole: 'title' },
  ],
  detail: [
    { key: 'title', label: 'Topic' },
    { key: 'subject', label: 'Subject' },
    { key: 'contents', label: 'What was covered', rich: true },
  ],
  // Read off the device, joined to the subject list — a topic carries only the
  // subject's id, and the teacher's own subjects are what name it. Whole, like
  // the subject list beside it: the endpoint takes no page, no limit and no
  // search term.
  collection: localFirst({
    entities: teacherTopics,
    lookup: teacherSubjects,
    rows: (recorded, subjects) => {
      const names = subjectNames(subjects);
      return byId(recorded).map((topic) => topicRow(topic, names));
    },
  }),
  source: async (params) => pageRows(await topicRows(), params),
  record: async (recordId) =>
    (await topicRows()).find((topic) => topic.id === String(recordId)),
  /**
   * Filed on the device and sent afterwards.
   *
   * A scheme of work is written up at the end of a lesson, which is exactly
   * where the signal is worst. What the teacher wrote is kept whatever the
   * connection is doing, and the pending-work drawer is where they can see it
   * is still waiting.
   *
   * Unlike the register and the mark sheet, a queued topic does not appear on
   * the subject's tab until the school has it. Those two are marked in bulk and
   * read back all day, so they overlay the queue on screen; this is one record
   * written once, and a ghost row that could not be opened or corrected would
   * cost more than it explained. The toast says it is saved, and the drawer
   * says it is waiting.
   */
  queue: (values, recordId) => {
    const named = String(values.title ?? '').trim() || 'Untitled topic';

    if (recordId) {
      return enqueue({
        handler: WRITE.updateTopic,
        payload: { id: recordId, body: topicUpdate(values) },
        collectionId: SET.teachingTopics,
        targetKey: recordId,
        toast: { success: 'Topic updated' },
        label: `Topic "${named}"`,
      });
    }

    return enqueue({
      handler: WRITE.addTopic,
      payload: topicBody(values),
      collectionId: SET.teachingTopics,
      // The school issues the id, so the device names it in the meantime.
      targetKey: newLocalKey(),
      toast: { success: 'Topic created' },
      label: `Topic "${named}"`,
    });
  },
  // No endpoint deletes one, so no row offers to. A topic recorded in error is
  // corrected on its own page.
  form: [
    {
      title: 'What you taught',
      fields: [
        {
          key: 'subject_id',
          label: 'Subject',
          required: true,
          optionsFrom: 'my-subjects',
          /*
           * Only ever read on the edit form, and on a create reached cold —
           * opened from a subject's page, this field is settled and shows that
           * subject's name instead of asking. The API does not move a topic
           * between subjects, so the edit form says so rather than offering a
           * change that is not saved.
           */
          hint: 'The subject this was taught in. It is chosen when the topic is added and not changed afterwards.',
        },
        {
          key: 'title',
          label: 'Topic',
          required: true,
          wide: true,
          placeholder: 'Quadratic equations — factorisation',
        },
        {
          key: 'contents',
          label: 'What was covered',
          required: true,
          rich: true,
          placeholder:
            'What the class did, and anything left for next week. Headings, lists and links are all kept.',
        },
      ],
    },
  ],
};

export const eclasses: CollectionDef = {
  id: 'eclasses',
  path: '/teacher/eclasses',
  // Three fields and no sub-tables: the record opens over the register.
  modal: true,
  kicker: 'Teaching',
  title: 'E-classes',
  description:
    'The online rooms opened for your classes. Follow a link to join the meeting.',
  // The endpoint reads; nothing in the API opens a room from here, so nothing
  // offers to schedule, edit or cancel one.
  readonly: true,
  action: 'E-classes',
  searchHint: 'Search room or link',
  footer: 'Newest first',
  emptyTitle: 'No e-classes yet',
  emptyBody:
    'Rooms opened for your classes appear here with the link to join them.',
  noun: 'e-class',
  nameKey: 'room',
  columns: [
    { key: 'room', label: 'Room', cardRole: 'title' },
    { key: 'link', label: 'Meeting link', link: true },
    { key: 'created', label: 'Opened', cardRole: 'subtitle' },
  ],
  detail: [
    { key: 'room', label: 'Room' },
    { key: 'link', label: 'Meeting link', link: true },
    { key: 'created', label: 'Opened' },
  ],
  // Read off the device, newest first — which now has to be said out loud. A
  // collection is keyed and hands its rows back in key order, so the order the
  // endpoint sent them in does not survive being stored.
  collection: localFirst({
    entities: teacherEClasses,
    rows: (rooms) => newestFirst(rooms, (room) => room.datecreated).map(eclassRow),
  }),
  source: async (params) => pageRows(await eclassRows(), params),
  record: async (recordId) =>
    (await eclassRows()).find((eclass) => eclass.id === String(recordId)),
};
