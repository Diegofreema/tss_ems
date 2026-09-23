import { heldDocument, heldRows } from '@/db/collection';
import { schoolingAssignments, schoolingResults } from '@/db/collections/schooling';
import { pageRows } from '@/features/collections/api';
import { localFirst } from '@/features/collections/local-first';
import type { CollectionDef } from '@/features/collections/types';
import { assignmentRows, assignmentTally } from '../features/assignments/assignments';
import { marksOf, resultRows, termAverage } from '../features/results/results';

/**
 * Every assignment set for the student's arm, through the cache so the list and
 * the three tiles above it read one answer between them.
 *
 * The rows are not what the assignment page reads: opening an assignment asks
 * `/assignments/{id}` for the questions, which this list does not carry.
 */
const mine = async () => assignmentRows(await heldRows(schoolingAssignments));
const tally = () => mine().then(assignmentTally);

export const assignments: CollectionDef = {
  id: 'assignments',
  path: '/student/assignments',
  kicker: 'Assessment',
  title: 'Assignments',
  description:
    'Assignments set for your arm, the open ones first. Each one can be answered once — open an assignment to see its questions.',
  // No button, and no `actionTo`: which assignment "Start the open assignment" would
  // open depends on which of them is open, and a fixed link cannot know. The
  // rows are the way in.
  action: 'Start the open assignment',
  readonly: true,
  searchHint: 'Search assignment or subject',
  footer: 'Open first, then what is still to come',
  emptyTitle: 'No assignments set',
  emptyBody:
    'Assignments appear here when a teacher opens one for your arm. Only assignments set for your own class are ever listed.',
  noun: 'assignment',
  nameKey: 'title',
  // No history: the API keeps no record of a student opening an assignment, only of
  // submitting one, and that is the state column.
  tabs: [],
  counts: [
    { label: 'Open now', count: () => tally().then((counted) => counted.open) },
    {
      label: 'Submitted',
      count: () => tally().then((counted) => counted.submitted),
    },
    {
      label: 'Closed, missed',
      count: () => tally().then((counted) => counted.missed),
    },
  ],
  columns: [
    { key: 'title', label: 'Assignment', cardRole: 'title' },
    { key: 'subject', label: 'Subject', cardRole: 'subtitle' },
    { key: 'questions', label: 'Questions', align: 'right' },
    { key: 'minutes', label: 'Minutes', align: 'right' },
    // Both ends, because "Not open yet" is the one state whose date is the
    // opening one — a student reading only "Closes" against an assignment
    // they cannot start yet is being shown the wrong half of the window.
    { key: 'opens', label: 'Opens' },
    { key: 'closes', label: 'Closes' },
    { key: 'state', label: 'State', tag: true, cardRole: 'tag' },
  ],
  /*
   * Read whole and searched here. The endpoint takes a `subject_id` and
   * nothing else — no search term, no state — and a student cannot list the
   * subjects to fill a dropdown with, so the box matches the title, the
   * subject and the state at once instead.
   */
  // Read off the device. `assignmentRows` puts the open ones first, then what
  // is still to come — which is what the footer promises and what a keyed
  // collection would otherwise undo.
  collection: localFirst({
    entities: schoolingAssignments,
    rows: (all) => assignmentRows(all),
  }),
  source: (params) => mine().then((all) => pageRows(all, params)),
  // No `record`: a row opens the assignment at `/student/assignments/{id}`, which reads
  // the questions the list never asked for.
};

const sheet = () => heldDocument(schoolingResults);

const marks = async () => {
  const held = await sheet();
  return held ? resultRows(marksOf(held)) : [];
};

export const results: CollectionDef = {
  id: 'results',
  path: '/student/results',
  kicker: 'Assessment',
  title: 'My results',
  description:
    'Every mark the office has approved for you, newest term first. A subject appears once your teacher has filed it and the office has approved the batch it came in.',
  // No button. The design's was "Download result sheet", and a student login can
  // reach no result sheet — nor any endpoint that would rank one.
  action: 'Download result sheet',
  readonly: true,
  searchHint: 'Search subject, term or grade',
  footer: 'Approved marks only, across every term',
  emptyTitle: 'No results yet',
  emptyBody:
    'A subject appears here once your teacher has filed the mark and the office has approved the batch it came in. A mark still waiting on either is never sent.',
  noun: 'result',
  nameKey: 'subject',
  // No history. The one figure worth a tile is the term average, and it is
  // the API's own — this page never worked one out, because an average over
  // marks from different terms is not a term average. A position needs the
  // class broadsheet, which a student login cannot reach.
  tabs: [],
  counts: [
    {
      label: 'Subjects released',
      count: async () => (await marks()).length,
    },
    {
      label: 'Term average',
      // Nought is a real average and "not marked yet" is not, so a term with
      // nothing in it reads as a dash rather than as a student who scored zero.
      count: async () => {
        // A sheet this device has never synced has no average to report, which
        // is the same "not marked yet" the dash below already stands for.
        const held = await sheet();
        return held ? (termAverage(held) ?? -1) : -1;
      },
      format: (value) => (value < 0 ? '—' : String(Math.round(value * 10) / 10)),
    },
  ],
  columns: [
    { key: 'subject', label: 'Subject', cardRole: 'title' },
    { key: 'term', label: 'Term', cardRole: 'subtitle' },
    { key: 'exam', label: 'Exam', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'grade', label: 'Grade', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'subject', label: 'Subject' },
    { key: 'klass', label: 'Class' },
    { key: 'session', label: 'Session' },
    { key: 'semester', label: 'Term' },
    { key: 'firstCa', label: 'First CA' },
    { key: 'secondCa', label: 'Second CA' },
    { key: 'homework', label: 'Homework / project' },
    { key: 'exam', label: 'Examination' },
    { key: 'total', label: 'Total' },
    { key: 'grade', label: 'Grade' },
    { key: 'remark', label: 'Remark' },
    { key: 'filed', label: 'Filed on' },
  ],
  /*
   * Read whole and searched here. The endpoint takes a session and a term, and
   * a student cannot name either of them — `/sessions` and `/semesters` are shut
   * to a student login — so a dropdown would have nothing to put in it. The box
   * matches the subject, the term and the grade at once instead.
   */
  // Read off the device. `resultRows` puts the newest term first, as the copy
  // says; the term average beside it is the school's own, which is why the
  // whole answer is kept rather than the list alone.
  collection: localFirst({
    entities: schoolingResults,
    rows: (held) => (held[0] ? resultRows(marksOf(held[0].doc)) : []),
  }),
  source: (params) => marks().then((all) => pageRows(all, params)),
  record: (recordId) =>
    marks().then((all) => all.find((row) => row.id === recordId)),
};
