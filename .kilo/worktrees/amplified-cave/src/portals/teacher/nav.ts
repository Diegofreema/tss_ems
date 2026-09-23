import {
  // Monitor,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  CalendarSearch,
  ClipboardCheck,
  FileQuestion,
  LayoutGrid,
  MessageSquare,
  MessagesSquare,
  PenLine,
  SquareCheckBig,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import type { NavGroup } from '@/lib/portal';

export const teacherNav: NavGroup[] = [
  {
    items: [
      { to: '/teacher', label: 'Dashboard', icon: LayoutGrid },
    ],
  },
  {
    heading: 'Teaching',
    icon: BookOpen,
    items: [
      // Topics taught has no row of its own: a topic belongs to a subject, so
      // the scheme of work is read and written from the subject's own page.
      { to: '/teacher/subjects', label: 'My subjects', icon: BookOpen },
      { to: '/teacher/students', label: 'My students', icon: Users },
      // No badge: nothing counts an untaken register school-wide — coverage is
      // asked one arm at a time, and a number here would be one arm's.
      {
        to: '/teacher/attendance',
        label: 'Take attendance',
        icon: CalendarCheck,
      },
      {
        to: '/teacher/registers',
        label: 'Attendance timeline',
        icon: CalendarSearch,
      },
      {
        to: '/teacher/timetable',
        label: 'Class timetables',
        icon: CalendarClock,
      },
      // { to: '/teacher/eclasses', label: 'E-classes', icon: Monitor },
    ],
  },
  {
    heading: 'Assessment',
    icon: ClipboardCheck,
    items: [
      // No badge: nothing in the API counts an outstanding score sheet — a
      // sheet is a subject and an arm the teacher chooses, not a record that
      // exists until it is filed — and a number here would be invented.
      { to: '/teacher/scores', label: 'Enter scores', icon: PenLine },
      // No badge either: what would be worth counting here is the assignments still
      // holding no questions, and the register counts those on its own tiles.
      {
        to: '/teacher/assignments',
        label: 'Assignments',
        icon: FileQuestion,
      },
      { to: '/teacher/uploads', label: 'Upload batches', icon: Upload },
      { to: '/teacher/results', label: 'Browse results', icon: SquareCheckBig },
      { to: '/teacher/performance', label: 'Performance', icon: TrendingUp },
    ],
  },
  {
    heading: 'Messages',
    icon: MessagesSquare,
    items: [
      // The threads both sides can write to. The two below it are outbound
      // email that nobody can answer — a different thing, kept apart on
      // purpose. No badge here: the header's messages button carries the
      // count, which is live where a nav label written in a module is not.
      { to: '/teacher/messages', label: 'Messages', icon: MessagesSquare },
      { to: '/teacher/msg-admin', label: 'Message admin', icon: MessageSquare },
      {
        to: '/teacher/msg-students',
        label: 'Message my students',
        icon: MessageSquare,
      },
    ],
  },
];
