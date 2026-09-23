import { createFileRoute } from '@tanstack/react-router'
import { parentChildren, parentInvoices } from '@/db/collections/parent'
import { freshenPage } from '@/features/collections/freshen'
import { childrenFor } from '@/portals/parent/collections'
import { CollectionPage } from '@/portals/parent/components/collection-page'
import { useFamily } from '@/portals/parent/parent.store'

export const Route = createFileRoute('/parent/children/')({
  staticData: { title: 'My children', crumb: 'My children' },
  // The children and what they owe: this register draws both, since the Fees
  // column is a sum over the invoices rather than anything on the child.
  loader: () => freshenPage('/parent/children', [parentChildren, parentInvoices]),
  component: ChildrenList,
})

function ChildrenList() {
  return <CollectionPage definition={childrenFor(useFamily())} />
}
