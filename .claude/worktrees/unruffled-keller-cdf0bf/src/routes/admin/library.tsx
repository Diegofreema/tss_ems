import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { library } from '@/portals/admin/collections/library'

export const Route = createFileRoute('/admin/library')({
  staticData: { title: 'Library', crumb: 'School' },
  component: () => <CollectionPage definition={library} />,
})
