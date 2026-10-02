import { createFileRoute } from '@tanstack/react-router'
import { teachingQuizRecords, teachingQuizSittings } from '@/db/collections/quizzes'
import { freshenRegister } from '@/features/collections/freshen'
import { quizzes } from '@/portals/teacher/collections/quizzes'
import { CollectionPage } from '@/portals/teacher/components/collection-page'

export const Route = createFileRoute('/teacher/quizzes')({
  staticData: { title: 'Quizzes', crumb: 'Assessment' },
  // The register's own set, and the two its record's tabs read — those fan
  // out per quiz and sync when this page wants them, not with the shell.
  loader: () => freshenRegister(quizzes, teachingQuizRecords, teachingQuizSittings),
  component: () => <CollectionPage definition={quizzes} />,
})
