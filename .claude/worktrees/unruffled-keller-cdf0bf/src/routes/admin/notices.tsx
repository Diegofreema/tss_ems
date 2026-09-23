import { createFileRoute } from '@tanstack/react-router'
import { notices } from '@/portals/admin/collections/notices'
import { CollectionPage } from '@/portals/admin/components/collection-page'

export const Route = createFileRoute('/admin/notices')({
  staticData: { title: 'Notice board', crumb: 'School' },
  component: () => <CollectionPage definition={notices} />,
})
