import { createFileRoute } from '@tanstack/react-router'
import { attendance } from '@/portals/student/collections/attendance'
import { CollectionPage } from '@/portals/student/components/collection-page'

export const Route = createFileRoute('/student/attendance')({
  staticData: { title: 'My attendance', crumb: 'Learning' },
  component: () => <CollectionPage definition={attendance} />,
})
