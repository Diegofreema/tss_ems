import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/teacher/components/collection-page'
import { results } from '@/portals/teacher/collections/assessment'

export const Route = createFileRoute('/teacher/results')({
  staticData: { title: 'Browse results', crumb: 'Assessment' },
  component: () => <CollectionPage definition={results} />,
})
