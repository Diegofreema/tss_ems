import { createFileRoute } from '@tanstack/react-router'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { books } from '@/portals/admin/collections/books'

export const Route = createFileRoute('/admin/library')({
  staticData: { title: 'Library', crumb: 'School' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(books),
  component: () => <CollectionPage definition={books} />,
})
