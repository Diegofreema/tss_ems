import { createFileRoute } from '@tanstack/react-router'
import {
  classTimetableQuery,
  timetableClassesQuery,
} from '@/features/timetable/queries'
import { mySubjectsQuery } from '@/portals/teacher/api/timetable'
import { TeacherTimetablePage } from '@/portals/teacher/features/timetable/timetable-page'

export const Route = createFileRoute('/teacher/timetable')({
  staticData: { title: 'Class timetables', crumb: 'Teaching' },
  // The classes have to answer before the weeks can be asked for, so the fan
  // out happens here rather than in the component: the page draws once, whole,
  // instead of six calendars appearing one at a time.
  loader: async ({ context }) => {
    // Started and swallowed, like every loader in the portals: a loader that
    // rethrows offline replaces the page, and one that awaited a paused query
    // used to hang it on the shimmer for ever. The page's own suspense reads
    // the same queries and surfaces the honest failure with a retry.
    try {
      const [classes] = await Promise.all([
        context.queryClient.ensureQueryData(timetableClassesQuery),
        context.queryClient.ensureQueryData(mySubjectsQuery),
      ])
      await Promise.all(
        classes.map((klass) =>
          context.queryClient.ensureQueryData(classTimetableQuery(klass.id)),
        ),
      )
    } catch {
      // The component's `useSuspenseQuery` retries and throws to `RouteError`.
    }
  },
  component: TeacherTimetablePage,
})
