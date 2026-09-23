import { teachingService } from '@/api/teaching/service';
import { pageRows } from '@/features/collections/api';
import type { CollectionDef, Row } from '@/features/collections/types';
import { myEClasses, myMarks, myRoll, mySubjects, myTopics } from './mine';
import { topicBody, topicUpdate } from './teaching-body';
import {
  eclassRow,
  mySubjectRow,
  pupilRow,
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

const pupilRows = async (): Promise<Row[]> =>
  (await myRoll()).items.map(pupilRow);

export const subjects: CollectionDef = {
  id: 'subjects',
  path: '/teacher/subjects',
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
  // The endpoint answers whole and takes no search term, so the page is paged
  // and searched here — which also means the box matches every column.
  source: async (params) => pageRows(await subjectRows(), params),
  // There is no endpoint for one of these, so the record is found in the list
  // the register already asked for.
  record: async (recordId) =>
    (await subjectRows()).find((subject) => subject.id === String(recordId)),
};

export const students: CollectionDef = {
  id: 'students',
  path: '/teacher/students',
  kicker: 'Teaching',
  title: 'My students',
  description:
    'Every pupil in the class you take. Open a pupil for what the school holds about them and their marks in your subjects.',
  // The office admits pupils and places them in arms; a teacher reads the roll.
  readonly: true,
  action: 'My students',
  searchHint: 'Search pupil, admission no. or arm',
  footer: 'The classes you take',
  emptyTitle: 'No pupils on your roll',
  emptyBody:
    'Pupils appear here once the office has placed them in an arm you take.',
  noun: 'pupil',
  nameKey: 'name',
  counts: [
    { label: 'Pupils', count: async () => (await myRoll()).pagination.total },
    // The arms come back beside the roll rather than on it, which is the only
    // way an arm the teacher takes but which holds nobody is counted at all.
    { label: 'Classes', count: async () => (await myRoll()).class_arms.length },
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
  // The endpoint pages but ignores a search term, so the roll is read whole
  // and searched here — on every column, not the one field a parameter would
  // have narrowed.
  source: async (params) => pageRows(await pupilRows(), params),
  record: async (recordId) =>
    (await pupilRows()).find((pupil) => pupil.id === String(recordId)),
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
        return marks.items
          .filter((mark) => String(mark.student_id) === String(recordId))
          .map((mark) => scoreRow(mark, names));
      },
      empty:
        'No mark has been recorded for this pupil in any of your subjects.',
    },
  ],
};

export const topics: CollectionDef = {
  id: 'topics',
  path: '/teacher/topics',
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
  // Whole, like the subject list beside it: the endpoint takes no page, no
  // limit and no search term.
  source: async (params) => pageRows(await topicRows(), params),
  record: async (recordId) =>
    (await topicRows()).find((topic) => topic.id === String(recordId)),
  save: (values, recordId) =>
    recordId
      ? teachingService.updateTopic(recordId, topicUpdate(values))
      : teachingService.addTopic(topicBody(values)),
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
          hint: 'One of your own subjects. Chosen when the topic is added and not changed afterwards.',
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
  source: async (params) => pageRows(await eclassRows(), params),
  record: async (recordId) =>
    (await eclassRows()).find((eclass) => eclass.id === String(recordId)),
};
