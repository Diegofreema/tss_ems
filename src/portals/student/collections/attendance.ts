import { heldDocument } from '@/db/collection';
import { schoolingAttendance } from '@/db/collections/schooling';
import { pageRows } from '@/features/collections/api';
import { localFirst } from '@/features/collections/local-first';
import type { CollectionDef } from '@/features/collections/types';
import {
  attendanceRate,
  attendanceRows,
  countOf,
  daysMarked,
} from '../features/attendance/attendance';

/**
 * The student's own register, off the device.
 *
 * An empty answer stands in for one this device holds nothing of, because
 * every reader below already treats a register with no days in it as a term
 * nobody marked — which is exactly what a device that has never synced knows.
 * A set that never synced at all refuses inside `heldDocument` instead, and
 * that refusal is what puts the page into its "could not load" state.
 */
const held = async () => (await heldDocument(schoolingAttendance)) ?? {};

export const attendance: CollectionDef = {
  id: 'attendance',
  path: '/student/attendance',
  // Four fields and no sub-tables: the record opens over the register.
  modal: true,
  kicker: 'Learning',
  title: 'My attendance',
  description:
    'Every day your form teacher took the register, and how you were marked. A day nobody marked is not on this list — and is not held against you.',
  // Never rendered — a readonly collection draws no primary button — but the
  // framework asks every definition to name one.
  action: 'Take attendance',
  readonly: true,
  searchHint: 'Search date, day or mark',
  footer: 'Newest day first',
  emptyTitle: 'Nothing marked yet',
  emptyBody:
    'Your form teacher takes the register each day it is held. Once a day is marked, it appears here.',
  noun: 'day',
  nameKey: 'date',
  tabs: [],
  counts: [
    { label: 'Days marked', count: async () => held().then(daysMarked) },
    {
      label: 'Present',
      count: async () => countOf(await held(), 'present'),
    },
    { label: 'Absent', count: async () => countOf(await held(), 'absent') },
    {
      label: 'Attendance',
      // A range nobody marked has no rate, and nought per cent would read as a
      // student who missed every day rather than a school that took no register.
      count: async () => attendanceRate(await held()) ?? -1,
      format: (value) => (value < 0 ? '—' : `${Math.round(value)}%`),
    },
  ],
  columns: [
    { key: 'date', label: 'Date', cardRole: 'title' },
    { key: 'day', label: 'Day', cardRole: 'subtitle' },
    { key: 'state', label: 'Mark', tag: true, cardRole: 'tag' },
    { key: 'note', label: 'Note' },
  ],
  /*
   * Read whole and searched here. The endpoint takes a date range and a
   * status, and a student has no term to name to fill a dropdown with — so the
   * box matches the date, the day and the mark at once instead.
   */
  // Read off the device. `attendanceRows` puts the newest day first, as the
  // footer promises; the school's own rate sits beside the list in the same
  // answer, which is why the whole thing is kept rather than the days alone.
  collection: localFirst({
    entities: schoolingAttendance,
    rows: (kept) => (kept[0] ? attendanceRows(kept[0].doc) : []),
  }),
  source: (params) =>
    held().then((answer) => pageRows(attendanceRows(answer), params)),
  // No `record`: a day is four cells, all of them already on the row.
};
