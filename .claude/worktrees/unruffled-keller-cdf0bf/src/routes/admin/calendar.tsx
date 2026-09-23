import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { sessions } from '@/portals/admin/collections/calendar'

export const Route = createFileRoute('/admin/calendar')({
  staticData: { title: 'Academic sessions', crumb: 'Academics' },
  component: () => <CollectionPage definition={sessions} />,
})
