import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { parents } from '@/portals/admin/collections/parents'

export const Route = createFileRoute('/admin/parents')({
  staticData: { title: 'All parents', crumb: 'Parents' },
  component: () => <CollectionPage definition={parents} />,
})
