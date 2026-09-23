import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/teacher/components/collection-page'
import { students } from '@/portals/teacher/collections/teaching'

export const Route = createFileRoute('/teacher/students')({
  staticData: { title: 'My students', crumb: 'Teaching' },
  component: () => <CollectionPage definition={students} />,
})
