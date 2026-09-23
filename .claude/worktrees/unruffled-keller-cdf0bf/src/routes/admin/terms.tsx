import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { terms } from '@/portals/admin/collections/calendar'

export const Route = createFileRoute('/admin/terms')({
  staticData: { title: 'Terms', crumb: 'Academics' },
  component: () => <CollectionPage definition={terms} />,
})
