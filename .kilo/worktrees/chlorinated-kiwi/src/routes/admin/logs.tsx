import { createFileRoute } from '@tanstack/react-router'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { logs } from '@/portals/admin/collections/school'

export const Route = createFileRoute('/admin/logs')({
  staticData: { title: 'Activity log', crumb: 'School' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(logs),
  component: () => <CollectionPage definition={logs} />,
})
