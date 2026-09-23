import type { PortalConfig } from '@/lib/portal';
import { useMyNotifications } from '@/features/notifications/use-notice-feed'
import { StudentContext } from './features/identity/student-context';
import { studentNav } from './nav';

export const studentPortal: PortalConfig = {
  role: 'student',
  roleLabel: 'Student',
  basePath: '/student',
  nav: studentNav,
  useNotifications: useMyNotifications,
  notFoundAudience: 'students',
  notFoundLinks: [
    // Hints describe the page, not its contents: nothing here has counted
    // anything, and a figure written in would be read as one that had.
    { to: '/student', label: 'Dashboard', hint: 'Where your term stands' },
    {
      to: '/student/assignments',
      label: 'Assignments',
      hint: 'Assignments you can still sit',
    },
    {
      to: '/student/results',
      label: 'My results',
      hint: 'What the office has approved',
    },
    {
      to: '/student/materials',
      label: 'Course materials',
      hint: 'What your teachers shared',
    },
  ],
  context: <StudentContext />,
  // No `headerStatus`. The design's "First Term · Week 9 · Exams begin 02 Dec"
  // wants the school calendar, and a student login is refused every endpoint
  // that holds it — `/settings`, `/sessions` and `/semesters` all answer
  // "restricted to administrators". What a student can be told about themselves
  // is in the sidebar instead, where it is read off their own record.
};
