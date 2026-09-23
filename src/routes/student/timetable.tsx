import { createFileRoute } from '@tanstack/react-router'
import { freshen } from '@/db/collection'
import { schoolingCourses, schoolingTimetable } from '@/db/collections/schooling'
import { TimetablePage } from '@/portals/student/features/timetable/timetable-page'

export const Route = createFileRoute('/student/timetable')({
  staticData: { title: 'My timetable', crumb: 'Learning' },
  // Both sets readied here so the calendar never draws into an empty shell —
  // the grid and the teacher names arrive together or not at all. Awaited,
  // unlike the shell's, because this page is the outlet rather than the shell:
  // a page that waits is a page, and a shell that waits is a blank portal.
  //
  // The school is asked again on the way in, and only the readying is waited
  // for: a timetable is redrawn the week the school moves a period, and a
  // device that has held one since September has no way of knowing it moved.
  loader: () => freshen([schoolingTimetable, schoolingCourses]),
  component: TimetablePage,
})
