import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/teacher/components/collection-page'
import { subjects } from '@/portals/teacher/collections/teaching'

export const Route = createFileRoute('/teacher/subjects')({
  staticData: { title: 'My subjects', crumb: 'Teaching' },
  component: () => <CollectionPage definition={subjects} />,
})
