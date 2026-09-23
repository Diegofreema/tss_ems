import { createFileRoute } from '@tanstack/react-router'
import { setQuestions, setSubmissions } from '@/db/collections/set-assignments'
import { freshenRegister } from '@/features/collections/freshen'
import { assignments } from '@/portals/teacher/collections/assignments'
import { CollectionPage } from '@/portals/teacher/components/collection-page'

export const Route = createFileRoute('/teacher/assignments')({
  staticData: { title: 'Set assignments', crumb: 'Assessment' },
  // The register's own set, and the two the record's tabs read — those fan
  // out per assignment and sync when this page wants them rather than with
  // the shell. All three are asked for again on the way in: a submission
  // landing while a teacher has the portal open is the whole reason to look.
  loader: () => freshenRegister(assignments, setQuestions, setSubmissions),
  component: () => <CollectionPage definition={assignments} />,
})
