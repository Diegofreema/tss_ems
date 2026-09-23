import { createFileRoute } from '@tanstack/react-router'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/teacher/components/collection-page'
import { results } from '@/portals/teacher/collections/assessment'

export const Route = createFileRoute('/teacher/results')({
  staticData: { title: 'Browse results', crumb: 'Assessment' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(results),
  component: () => <CollectionPage definition={results} />,
})
