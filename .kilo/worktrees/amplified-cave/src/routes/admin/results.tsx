import { createFileRoute } from '@tanstack/react-router'
import { results } from '@/portals/admin/collections/results'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/admin/components/collection-page'

export const Route = createFileRoute('/admin/results')({
  staticData: { title: 'Results', crumb: 'Academics' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(results),
  component: () => <CollectionPage definition={results} />,
})
