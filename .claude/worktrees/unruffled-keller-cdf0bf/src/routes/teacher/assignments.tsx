import { createFileRoute } from '@tanstack/react-router'
import { assignments } from '@/portals/teacher/collections/assignments'
import { CollectionPage } from '@/portals/teacher/components/collection-page'

export const Route = createFileRoute('/teacher/assignments')({
  staticData: { title: 'Set assignments', crumb: 'Assessment' },
  component: () => <CollectionPage definition={assignments} />,
})
