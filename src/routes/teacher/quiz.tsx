import { createFileRoute } from '@tanstack/react-router'
import { freshen } from '@/db/collection'
import { teachingQuizRecords, teachingQuizzes } from '@/db/collections/quizzes'
import { pageSearch } from '@/lib/search'
import { QuizPage } from '@/portals/teacher/features/quizzes/quiz-page'

export const Route = createFileRoute('/teacher/quiz')({
  // Which quiz's questions are being written.
  validateSearch: pageSearch(['quiz']),
  // Asked for again on the way in: a question written on the staffroom
  // machine has to be on this one before another is added under it, and the
  // school's reason a quiz cannot open yet changes with every question.
  loader: () => freshen([teachingQuizzes, teachingQuizRecords]),
  staticData: {
    title: 'Quiz questions',
    crumb: 'Assessment · Quizzes',
    crumbTo: '/teacher/quizzes',
  },
  component: QuizPage,
})
