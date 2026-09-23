import { createFileRoute } from '@tanstack/react-router'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/student/components/collection-page'
import { materials } from '@/portals/student/collections/learning'

export const Route = createFileRoute('/student/materials/')({
  staticData: { title: 'Course materials', crumb: 'Learning' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(materials),
  component: () => <CollectionPage definition={materials} />,
})
