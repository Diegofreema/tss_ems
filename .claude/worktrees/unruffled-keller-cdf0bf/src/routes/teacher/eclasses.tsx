import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/teacher/components/collection-page'
import { eclasses } from '@/portals/teacher/collections/teaching'

export const Route = createFileRoute('/teacher/eclasses')({
  staticData: { title: 'E-classes', crumb: 'Teaching' },
  component: () => <CollectionPage definition={eclasses} />,
})
