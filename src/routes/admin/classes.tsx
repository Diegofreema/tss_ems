import { createFileRoute } from '@tanstack/react-router'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { classes } from '@/portals/admin/collections/academics'

export const Route = createFileRoute('/admin/classes')({
  staticData: { title: 'Classes & arms', crumb: 'Academics' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(classes),
  component: () => <CollectionPage definition={classes} />,
})
