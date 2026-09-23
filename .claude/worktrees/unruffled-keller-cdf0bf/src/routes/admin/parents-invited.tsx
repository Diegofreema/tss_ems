import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { parentsDeactivated } from '@/portals/admin/collections/parents'

export const Route = createFileRoute('/admin/parents-invited')({
  staticData: { title: 'Deactivated', crumb: 'Parents' },
  component: () => <CollectionPage definition={parentsDeactivated} />,
})
