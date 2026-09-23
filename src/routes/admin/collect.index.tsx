import { createFileRoute } from '@tanstack/react-router'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { collect } from '@/portals/admin/collections/finance'

export const Route = createFileRoute('/admin/collect/')({
  staticData: { title: 'Fee collection', crumb: 'Finance' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(collect),
  component: () => <CollectionPage definition={collect} />,
})
