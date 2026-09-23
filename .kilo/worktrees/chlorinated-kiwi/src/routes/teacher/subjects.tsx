import { createFileRoute } from '@tanstack/react-router'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/teacher/components/collection-page'
import { subjects } from '@/portals/teacher/collections/teaching'

export const Route = createFileRoute('/teacher/subjects')({
  staticData: { title: 'My subjects', crumb: 'Teaching' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(subjects),
  component: () => <CollectionPage definition={subjects} />,
})
