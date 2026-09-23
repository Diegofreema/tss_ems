import { createFileRoute } from '@tanstack/react-router'
import { freshen } from '@/db/collection'
import {
  teacherArms,
  teacherMarks,
  teacherRoll,
  teacherSubjects,
} from '@/db/collections/teaching'
import { ScoresPage } from '@/portals/teacher/features/scores/scores-page'

export const Route = createFileRoute('/teacher/scores')({
  staticData: { title: 'Enter scores', crumb: 'Assessment' },
  // The four sets the sheet is drawn from, asked for again each time it is
  // opened. Marks especially: a batch approved by the office, or a colleague's
  // entry on the same arm, both happen on another machine, and a sheet filled
  // in over a stale copy is the one place in this portal where that becomes a
  // wrong number on a child's record.
  loader: () => freshen([teacherSubjects, teacherRoll, teacherArms, teacherMarks]),
  component: ScoresPage,
})
