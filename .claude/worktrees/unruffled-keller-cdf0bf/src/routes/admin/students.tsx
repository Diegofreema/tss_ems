import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { students } from '@/portals/admin/collections/students'

export const Route = createFileRoute('/admin/students')({
  staticData: { title: 'Enrolled pupils', crumb: 'Students' },
  component: () => <CollectionPage definition={students} />,
})
