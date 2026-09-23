import { createFileRoute } from '@tanstack/react-router'
import { attendance } from '@/portals/student/collections/attendance'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/student/components/collection-page'

export const Route = createFileRoute('/student/attendance')({
  staticData: { title: 'My attendance', crumb: 'Learning' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(attendance),
  component: () => <CollectionPage definition={attendance} />,
})
