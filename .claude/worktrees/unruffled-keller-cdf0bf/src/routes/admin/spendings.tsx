import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { spendings } from '@/portals/admin/collections/finance'

export const Route = createFileRoute('/admin/spendings')({
  staticData: { title: 'Spendings', crumb: 'Finance' },
  component: () => <CollectionPage definition={spendings} />,
})
