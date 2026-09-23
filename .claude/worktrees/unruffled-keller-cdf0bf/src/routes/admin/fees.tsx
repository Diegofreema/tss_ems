import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { fees } from '@/portals/admin/collections/finance'

export const Route = createFileRoute('/admin/fees')({
  staticData: { title: 'Fee catalogue', crumb: 'Finance' },
  component: () => <CollectionPage definition={fees} />,
})
