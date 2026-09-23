import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { arms } from '@/portals/admin/collections/academics'

export const Route = createFileRoute('/admin/arms')({
  staticData: { title: 'Class arms', crumb: 'Academics' },
  component: () => <CollectionPage definition={arms} />,
})
