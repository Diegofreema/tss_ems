import { createFileRoute } from '@tanstack/react-router'
import { resultQueue } from '@/portals/admin/collections/results'
import { CollectionPage } from '@/portals/admin/components/collection-page'

export const Route = createFileRoute('/admin/result-queue')({
  staticData: { title: 'Result approvals', crumb: 'Academics' },
  component: () => <CollectionPage definition={resultQueue} />,
})
