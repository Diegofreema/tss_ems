import { createFileRoute } from '@tanstack/react-router'
import { freshenRegister } from '@/features/collections/freshen'
import { CollectionPage } from '@/portals/student/components/collection-page'
import { invoices } from '@/portals/student/collections/finance'

export const Route = createFileRoute('/student/invoices')({
  staticData: { title: 'My invoices', crumb: 'Finance' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(invoices),
  component: () => <CollectionPage definition={invoices} />,
})
