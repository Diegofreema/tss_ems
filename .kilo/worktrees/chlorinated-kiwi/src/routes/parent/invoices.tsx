import { createFileRoute } from '@tanstack/react-router'
import { parentChildren, parentInvoices } from '@/db/collections/parent'
import { freshenPage } from '@/features/collections/freshen'
import { invoicesFor } from '@/portals/parent/collections'
import { CollectionPage } from '@/portals/parent/components/collection-page'
import { useFamily, useSelectedChild } from '@/portals/parent/parent.store'

export const Route = createFileRoute('/parent/invoices')({
  staticData: { title: 'Invoices', crumb: 'Finance' },
  // A bill settled at the bursary this morning is the thing a guardian opens
  // this page to check, and it is written on a machine that is not this one.
  loader: () => freshenPage('/parent/invoices', [parentChildren, parentInvoices]),
  component: InvoicesList,
})

function InvoicesList() {
  return <CollectionPage definition={invoicesFor(useSelectedChild(), useFamily())} />
}
