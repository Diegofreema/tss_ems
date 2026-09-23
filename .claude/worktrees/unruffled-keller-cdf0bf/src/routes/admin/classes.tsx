import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { classes } from '@/portals/admin/collections/academics'

export const Route = createFileRoute('/admin/classes')({
  staticData: { title: 'Classes & arms', crumb: 'Academics' },
  component: () => <CollectionPage definition={classes} />,
})
