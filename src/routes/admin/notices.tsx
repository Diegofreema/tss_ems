import { createFileRoute } from '@tanstack/react-router'
import { notices } from '@/portals/admin/collections/notices'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/admin/components/collection-page'

export const Route = createFileRoute('/admin/notices')({
  staticData: { title: 'Notice board', crumb: 'School' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(notices),
  component: () => <CollectionPage definition={notices} />,
})
