import { pageRows } from '@/features/collections/api';
import type { CollectionDef } from '@/features/collections/types';
import { queryClient } from '@/lib/query-client';
import { studentAttendanceQuery } from '../api/queries';
import {
  attendanceRate,
  attendanceRows,
  countOf,
  daysMarked,
} from '../features/attendance/attendance';

const register = () => queryClient.ensureQueryData(studentAttendanceQuery);

export const attendance: CollectionDef = {
  id: 'attendance',
  path: '/student/attendance',
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
    { label: 'Days marked', count: async () => daysMarked(await register()) },
    {
      label: 'Present',
      count: async () => countOf(await register(), 'present'),
    },
    { label: 'Absent', count: async () => countOf(await register(), 'absent') },
    {
      label: 'Attendance',
      // A range nobody marked has no rate, and nought per cent would read as a
      // pupil who missed every day rather than a school that took no register.
      count: async () => attendanceRate(await register()) ?? -1,
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
   * status, and a pupil has no term to name to fill a dropdown with — so the
   * box matches the date, the day and the mark at once instead.
   */
  source: (params) =>
    register().then((answer) => pageRows(attendanceRows(answer), params)),
  // No `record`: a day is four cells, all of them already on the row.
};
