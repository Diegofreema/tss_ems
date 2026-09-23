import { createFileRoute } from '@tanstack/react-router'
import {
  studentCoursesQuery,
  studentTimetableQuery,
} from '@/portals/student/api/queries'
import { TimetablePage } from '@/portals/student/features/timetable/timetable-page'

export const Route = createFileRoute('/student/timetable')({
  staticData: { title: 'My timetable', crumb: 'Learning' },
  // Both answers fetched here so the calendar never suspends into an empty
  // shell — the grid and the teacher names arrive together or not at all.
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(studentTimetableQuery),
      context.queryClient.ensureQueryData(studentCoursesQuery),
    ]),
  component: TimetablePage,
})
