import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { collect } from '@/portals/admin/collections/finance'

export const Route = createFileRoute('/admin/collect/')({
  staticData: { title: 'Fee collection', crumb: 'Finance' },
  component: () => <CollectionPage definition={collect} />,
})
