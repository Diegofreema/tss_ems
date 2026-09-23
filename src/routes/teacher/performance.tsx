import { createFileRoute } from '@tanstack/react-router'
import { freshen } from '@/db/collection'
import { teacherRoll } from '@/db/collections/teaching'
import { TeacherPerformancePage } from '@/portals/teacher/features/performance/teacher-performance-page'

export const Route = createFileRoute('/teacher/performance')({
  staticData: { title: 'Performance', crumb: 'Assessment' },
  // The roll behind the pupil picker. The figures themselves are asked for by
  // the page, which is on the query path and already refetches when it opens;
  // this is so a child enrolled this week can be picked at all.
  loader: () => freshen([teacherRoll]),
  component: TeacherPerformancePage,
})
