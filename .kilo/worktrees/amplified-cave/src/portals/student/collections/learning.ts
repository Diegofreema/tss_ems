import { heldDocument, heldRows } from '@/db/collection';
import {
  schoolingContent,
  schoolingCourses,
  schoolingMaterials,
  schoolingTimetable,
} from '@/db/collections/schooling';
import { pageRows } from '@/features/collections/api';
import { localFirst } from '@/features/collections/local-first';
import type { CollectionDef } from '@/features/collections/types';
import { courseRows } from '../features/courses/courses';
import { topicRows } from '../features/courses/topics';
import { materialRows } from '../features/materials/materials';
import { periodRows } from '../features/timetable/timetable';

/**
 * The subjects the student is registered for, through the cache so the list and
 * the record it opens read one answer between them.
 */
/*
 * A set that synced and came back with nothing is an empty register, not a
 * failure — the student is registered for no subject yet. A set that never
 * synced refuses inside `heldDocument`, which is the case worth saying out
 * loud, and it says it by throwing.
 */
const registered = async () => {
  const held = await heldDocument(schoolingCourses);
  return held ? courseRows(held) : [];
};

export const courses: CollectionDef = {
  id: 'courses',
  path: '/student/courses',
  /*
   * A page, not a modal.
   *
   * It was a modal on the rule this app follows everywhere: a record of six
   * short fields and no sub-tables opens over its register rather than taking
   * the reader somewhere. It has a sub-table now — what the teacher has
   * written up for the subject — and a scheme of work is the opposite of a
   * modal's shape: prose, several entries of it, read rather than glanced at.
   * A modal draws no tabs by design, so the choice is not between two
   * decorations, it is between showing this and not.
   */
  kicker: 'Learning',
  title: 'My subjects',
  description:
    'The subjects you are registered for this term, and who teaches each. Open one for the class and term it was registered against.',
  // No button. The design's was "Download timetable", and there is no
  // timetable on this API — not a shut endpoint, no endpoint at all.
  action: 'Download timetable',
  readonly: true,
  searchHint: 'Search subject, code or teacher',
  footer: 'Every subject on your registration, in alphabetical order',
  emptyTitle: 'No subjects yet',
  emptyBody:
    'Your subjects appear here once the office registers you for them, and a registration is made for one class and one term at a time. Your marks are on My results whether or not a subject is listed here.',
  noun: 'course',
  nameKey: 'name',
  // No tiles: this is a list of what a student takes, and the API keeps no
  // record of when they were put on it.
  tabs: [
    {
      label: 'Topics',
      /*
       * Panels rather than a table, and the same shape the teacher who wrote
       * these reads them in. A topic is a heading and the prose under it: as
       * columns the prose is cut to whatever fits one line, which is the half
       * worth reading, and the frame scrolls sideways on the phone most of
       * these children are holding.
       */
      accordion: {
        title: 'title',
        body: 'contents',
        meta: 'meta',
        empty: 'Your teacher filed this topic without anything written under it.',
      },
      /*
       * Off the device and filtered here. `GET /students/me/content` takes a
       * `subject_id` and is not sent one — the whole answer is small, one
       * request covers every subject, and a set held whole is one a child can
       * open in a classroom with no signal. See `mySchoolingService.content`.
       */
      source: async (recordId) =>
        topicRows(await heldDocument(schoolingContent), recordId),
      empty:
        'Your teacher has not written anything up for this subject yet. Anything they add appears here.',
    },
  ],
  columns: [
    { key: 'code', label: 'Code', cardRole: 'title' },
    { key: 'name', label: 'Subject', cardRole: 'subtitle' },
    { key: 'teacher', label: 'Teacher' },
  ],
  detail: [
    { key: 'name', label: 'Subject' },
    { key: 'code', label: 'Code' },
    { key: 'teacher', label: 'Teacher' },
    { key: 'klass', label: 'Registered in' },
    { key: 'session', label: 'Session' },
    { key: 'term', label: 'Term' },
  ],
  // Read off the device. `courseRows` already sorts alphabetically, which is
  // what the footer promises and what a keyed collection would otherwise undo.
  collection: localFirst({
    entities: schoolingCourses,
    rows: (held) => (held[0] ? courseRows(held[0].doc) : []),
  }),
  source: (params) => registered().then((all) => pageRows(all, params)),
  record: (recordId) =>
    registered().then((all) => all.find((row) => row.id === recordId)),
};

/**
 * The notes and assignments shared with the student's class, through the cache so the
 * list and the record it opens read one answer between them.
 */
const shared = async () => materialRows(await heldRows(schoolingMaterials));

export const materials: CollectionDef = {
  id: 'materials',
  path: '/student/materials',
  // Four fields and no sub-tables: the record opens over the register.
  modal: true,
  kicker: 'Learning',
  title: 'Course materials',
  description:
    'Notes, slides and past papers your teachers have shared with your class, newest first.',
  // No button. The design's was "Download all", and there is nothing to
  // download: this endpoint sends no file and no address to fetch one from.
  action: 'Download all',
  readonly: true,
  searchHint: 'Search material or subject',
  footer: 'Everything shared with your class this session',
  emptyTitle: 'Nothing shared yet',
  emptyBody:
    'Notes, slides and past papers appear here as your teachers share them. None have been shared with any class yet.',
  noun: 'material',
  nameKey: 'title',
  // No history and no tiles: a student may read what was shared with them, and
  // the API keeps no record of who opened what.
  tabs: [],
  columns: [
    { key: 'title', label: 'Material', cardRole: 'title' },
    { key: 'subject', label: 'Subject', cardRole: 'subtitle' },
    { key: 'added', label: 'Added' },
  ],
  detail: [
    { key: 'title', label: 'Material' },
    { key: 'subject', label: 'Subject' },
    { key: 'klass', label: 'Shared with' },
    { key: 'sharedOn', label: 'Shared on' },
  ],
  // Read off the device. `materialRows` puts the newest first, as the copy says.
  collection: localFirst({
    entities: schoolingMaterials,
    rows: (all) => materialRows(all),
  }),
  source: (params) => shared().then((all) => pageRows(all, params)),
  record: (recordId) =>
    shared().then((all) => all.find((row) => row.id === recordId)),
};

/**
 * The week as the school runs it, off `GET /timetables/mine`.
 *
 * Two answers, not one: the grid says what is taught when, and the student's
 * course list says who teaches it — a period carries `subject_id` but no
 * teacher, and the two endpoints number subjects the same way. Both go through
 * the cache, so the calendar, the record a block opens and My subjects share
 * them.
 */
const week = async () => {
  const [grid, courses] = await Promise.all([
    heldDocument(schoolingTimetable),
    heldDocument(schoolingCourses),
  ]);
  return grid && courses ? periodRows(grid, courses) : [];
};

/**
 * The record a period opens, and nothing else.
 *
 * `/student/timetable` is a calendar rather than a list — `TimetablePage`
 * draws it — so the list half of this definition is never rendered: no
 * `source`, and the strings the type asks for are what the record page reads
 * or what a list would say if one were ever pointed back at it.
 */
export const timetable: CollectionDef = {
  id: 'timetable',
  path: '/student/timetable',
  kicker: 'Learning',
  title: 'My timetable',
  description:
    'Your periods for the week, in the order they are taught. Open one for the class and term it was drawn for.',
  // No button. The design's was "Download PDF", and this endpoint sends no
  // file and no address to fetch one from.
  action: 'Download PDF',
  readonly: true,
  searchHint: 'Search subject or day',
  footer: 'Monday to Friday, in order',
  emptyTitle: 'No timetable to show',
  // The API's own sentence is "No timetable has been entered for this class
  // yet." Said here in the student's terms: a definition takes a static string,
  // and the reason is the same either way.
  emptyBody:
    'The office has not entered the week’s periods for your class yet. The subjects you take, and who teaches each, are on My subjects.',
  noun: 'period',
  nameKey: 'subject',
  // No history and no tiles: a period is a slot in a week, and the API keeps
  // no record of when one was changed.
  tabs: [],
  columns: [
    { key: 'day', label: 'Day', cardRole: 'title' },
    { key: 'time', label: 'Time', cardRole: 'subtitle' },
    { key: 'subject', label: 'Subject' },
    { key: 'teacher', label: 'Teacher' },
  ],
  // The design's fifth column is Room, and it is not built: `where`, `venue`
  // and `lecturehall_id` are null on every period the school holds, and a room
  // is the one field here that could send a student to the wrong door.
  detail: [
    { key: 'subject', label: 'Subject' },
    { key: 'day', label: 'Day' },
    { key: 'time', label: 'Time' },
    { key: 'teacher', label: 'Teacher' },
    { key: 'klass', label: 'Class' },
    { key: 'session', label: 'Session' },
    { key: 'term', label: 'Term' },
  ],
  record: (recordId) => week().then((all) => all.find((row) => row.id === recordId)),
};
