import { createFileRoute } from '@tanstack/react-router'
import { freshen } from '@/db/collection'
import { setAssignments, setQuestions } from '@/db/collections/set-assignments'
import { pageSearch } from '@/lib/search'
import { QuestionsPage } from '@/portals/teacher/features/assignments/questions-page'

export const Route = createFileRoute('/teacher/questions')({
  // Which assignment's questions are being written.
  validateSearch: pageSearch(['assignment']),
  // The sets fan out per assignment and are synced by the pages that read
  // them, not by the shell. Asked for again on the way in, and only the
  // readying waited for: a question written on the staffroom machine has to
  // be on this one before another is added under it.
  loader: () => freshen([setAssignments, setQuestions]),
  staticData: {
    title: 'Write the questions',
    crumb: 'Assessment · Set assignments',
    crumbTo: '/teacher/assignments',
  },
  component: QuestionsPage,
})
