import { createFileRoute } from '@tanstack/react-router'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { staffAdmin } from '@/portals/admin/collections/staff'

export const Route = createFileRoute('/admin/staff-admin')({
  staticData: { title: 'Administrators', crumb: 'Staff' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(staffAdmin),
  component: () => <CollectionPage definition={staffAdmin} />,
})
