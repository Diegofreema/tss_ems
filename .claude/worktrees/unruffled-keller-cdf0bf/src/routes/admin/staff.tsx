import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { staff } from '@/portals/admin/collections/staff'

export const Route = createFileRoute('/admin/staff')({
  staticData: { title: 'Manage staff', crumb: 'Staff' },
  component: () => <CollectionPage definition={staff} />,
})
