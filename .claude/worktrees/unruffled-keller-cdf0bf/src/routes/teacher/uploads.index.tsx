import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/teacher/components/collection-page'
import { uploads } from '@/portals/teacher/collections/assessment'

export const Route = createFileRoute('/teacher/uploads/')({
  staticData: { title: 'Upload batches', crumb: 'Assessment' },
  component: () => <CollectionPage definition={uploads} />,
})
