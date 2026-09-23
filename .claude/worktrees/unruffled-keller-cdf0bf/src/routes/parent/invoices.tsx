import { createFileRoute } from '@tanstack/react-router'
import { invoicesFor } from '@/portals/parent/collections'
import { CollectionPage } from '@/portals/parent/components/collection-page'
import { useFamily, useSelectedChild } from '@/portals/parent/parent.store'

export const Route = createFileRoute('/parent/invoices')({
  staticData: { title: 'Invoices', crumb: 'Finance' },
  component: InvoicesList,
})

function InvoicesList() {
  return <CollectionPage definition={invoicesFor(useSelectedChild(), useFamily())} />
}
