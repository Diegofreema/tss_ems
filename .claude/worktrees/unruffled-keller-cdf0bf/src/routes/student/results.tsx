import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/student/components/collection-page'
import { results } from '@/portals/student/collections/assessment'

export const Route = createFileRoute('/student/results')({
  staticData: { title: 'My results', crumb: 'Assessment' },
  component: () => <CollectionPage definition={results} />,
})
