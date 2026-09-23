import type { PortalConfig } from '@/lib/portal'
import { useMyNotifications } from '@/features/notifications/use-notice-feed'
import { MarkingTerm } from './features/term/marking-term'
import { teacherNav } from './nav'

export const teacherPortal: PortalConfig = {
  role: 'teacher',
  roleLabel: 'Teacher',
  basePath: '/teacher',
  nav: teacherNav,
  useNotifications: useMyNotifications,
  notFoundAudience: 'teachers',
  notFoundLinks: [
    // Hints describe the page, not its contents: nothing here has counted
    // anything, and a figure written in would be read as one that had.
    { to: '/teacher', label: 'Dashboard', hint: 'Your counters and the assignments you set' },
    { to: '/teacher/scores', label: 'Enter scores', hint: 'Mark a class, subject by subject' },
    { to: '/teacher/students', label: 'My students', hint: 'The pupils on your roll' },
    { to: '/teacher/topics', label: 'Topics taught', hint: 'What the office reads' },
  ],
  context: <MarkingTerm />,
  // No `headerStatus`. The design's "Week 9 of 13 · Results due 05 Dec" wants
  // the school calendar, and a teaching login is refused every endpoint that
  // holds it; the term the teacher is actually marking into is in the sidebar
  // instead, where it is read off their own marks.
}
