import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { invoices } from '@/portals/admin/collections/finance'

export const Route = createFileRoute('/admin/invoices')({
  staticData: { title: 'Invoices', crumb: 'Finance' },
  component: () => <CollectionPage definition={invoices} />,
})
