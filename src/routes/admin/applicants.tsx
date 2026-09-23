import { createFileRoute } from '@tanstack/react-router'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { applicants } from '@/portals/admin/collections/students'

export const Route = createFileRoute('/admin/applicants')({
  staticData: { title: 'Applicants', crumb: 'Students' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(applicants),
  component: () => <CollectionPage definition={applicants} />,
})
