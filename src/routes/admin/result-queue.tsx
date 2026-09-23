import { createFileRoute } from '@tanstack/react-router'
import { resultQueue } from '@/portals/admin/collections/results'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/admin/components/collection-page'

export const Route = createFileRoute('/admin/result-queue')({
  staticData: { title: 'Result approvals', crumb: 'Academics' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(resultQueue),
  component: () => <CollectionPage definition={resultQueue} />,
})
