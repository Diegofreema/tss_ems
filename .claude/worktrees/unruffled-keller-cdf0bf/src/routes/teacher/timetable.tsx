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
    const [classes] = await Promise.all([
      context.queryClient.ensureQueryData(timetableClassesQuery),
      context.queryClient.ensureQueryData(mySubjectsQuery),
    ])
    await Promise.all(
      classes.map((klass) =>
        context.queryClient.ensureQueryData(classTimetableQuery(klass.id)),
      ),
    )
  },
  component: TeacherTimetablePage,
})
