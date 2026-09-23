import { createFileRoute } from '@tanstack/react-router'
import { results } from '@/portals/admin/collections/results'
import { CollectionPage } from '@/portals/admin/components/collection-page'

export const Route = createFileRoute('/admin/results')({
  staticData: { title: 'Results', crumb: 'Academics' },
  component: () => <CollectionPage definition={results} />,
})
