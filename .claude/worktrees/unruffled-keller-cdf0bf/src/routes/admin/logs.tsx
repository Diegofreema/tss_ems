import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { logs } from '@/portals/admin/collections/school'

export const Route = createFileRoute('/admin/logs')({
  staticData: { title: 'Activity log', crumb: 'School' },
  component: () => <CollectionPage definition={logs} />,
})
