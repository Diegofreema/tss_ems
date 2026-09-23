import { createFileRoute } from '@tanstack/react-router'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/student/components/collection-page'
import { library } from '@/portals/student/collections/library'

export const Route = createFileRoute('/student/library')({
  staticData: { title: 'My books', crumb: 'Learning' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(library),
  component: () => <CollectionPage definition={library} />,
})
