import { createFileRoute } from '@tanstack/react-router'
import { ParentTimetablePage } from '@/portals/parent/features/timetable/timetable-page'

export const Route = createFileRoute('/parent/timetable')({
  staticData: { title: 'Timetables', crumb: 'My children' },
  // No loader. The household is primed by the portal's shell and the weeks
  // cannot be asked for until it answers, so the page suspends once, where
  // every other page under here does.
  component: ParentTimetablePage,
})
