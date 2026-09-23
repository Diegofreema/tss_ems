import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/student/components/collection-page'
import { materials } from '@/portals/student/collections/learning'

export const Route = createFileRoute('/student/materials/')({
  staticData: { title: 'Course materials', crumb: 'Learning' },
  component: () => <CollectionPage definition={materials} />,
})
