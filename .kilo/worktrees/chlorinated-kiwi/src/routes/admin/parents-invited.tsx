import { createFileRoute } from '@tanstack/react-router'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { parentsDeactivated } from '@/portals/admin/collections/parents'

export const Route = createFileRoute('/admin/parents-invited')({
  staticData: { title: 'Deactivated', crumb: 'Parents' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(parentsDeactivated),
  component: () => <CollectionPage definition={parentsDeactivated} />,
})
