import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/teacher/components/collection-page'
import { topics } from '@/portals/teacher/collections/teaching'

export const Route = createFileRoute('/teacher/topics')({
  staticData: { title: 'Topics taught', crumb: 'Teaching' },
  component: () => <CollectionPage definition={topics} />,
})
