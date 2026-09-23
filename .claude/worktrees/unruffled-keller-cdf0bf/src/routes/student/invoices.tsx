import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/student/components/collection-page'
import { invoices } from '@/portals/student/collections/finance'

export const Route = createFileRoute('/student/invoices')({
  staticData: { title: 'My invoices', crumb: 'Finance' },
  component: () => <CollectionPage definition={invoices} />,
})
