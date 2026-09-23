import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { staffOther } from '@/portals/admin/collections/staff'

export const Route = createFileRoute('/admin/staff-other')({
  staticData: { title: 'Other staff', crumb: 'Staff' },
  component: () => <CollectionPage definition={staffOther} />,
})
