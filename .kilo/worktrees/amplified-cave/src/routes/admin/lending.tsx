import { createFileRoute } from '@tanstack/react-router'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { library } from '@/portals/admin/collections/loans'

export const Route = createFileRoute('/admin/lending')({
  staticData: { title: 'Lending', crumb: 'School' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(library),
  component: () => <CollectionPage definition={library} />,
})
