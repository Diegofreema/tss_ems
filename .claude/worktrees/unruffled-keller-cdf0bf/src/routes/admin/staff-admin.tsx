import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { staffAdmin } from '@/portals/admin/collections/staff'

export const Route = createFileRoute('/admin/staff-admin')({
  staticData: { title: 'Administrators', crumb: 'Staff' },
  component: () => <CollectionPage definition={staffAdmin} />,
})
