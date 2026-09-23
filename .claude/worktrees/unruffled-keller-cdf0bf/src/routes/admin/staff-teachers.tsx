import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { staffTeachers } from '@/portals/admin/collections/staff'

export const Route = createFileRoute('/admin/staff-teachers')({
  staticData: { title: 'Teachers', crumb: 'Staff' },
  component: () => <CollectionPage definition={staffTeachers} />,
})
