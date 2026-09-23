import { createFileRoute } from '@tanstack/react-router'
import { freshen } from '@/db/collection'
import { refSessions, refTerms } from '@/db/collections/reference'
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
  /*
   * The school's own sessions and terms are asked for beside them, so the
   * sheet can offer the teacher a choice of which term to file into rather
   * than only the one its marks imply.
   *
   * Both answer "restricted to administrators" to a teaching login as things
   * stand. That costs nothing here and breaks nothing: `freshen` cannot fail
   * by design, a set that could not be read stays empty, and the pickers are
   * drawn only where there is something to pick. The day those endpoints open
   * to teachers, the lists fill and the pickers appear with no change here.
   */
  loader: () =>
    freshen([teacherSubjects, teacherRoll, teacherArms, teacherMarks, refSessions, refTerms]),
  component: ScoresPage,
})
