import { createFileRoute } from '@tanstack/react-router'
import { ReceiptPage } from '@/portals/admin/features/collect-receipt/receipt-page'

export const Route = createFileRoute('/admin/collect/receipt/$invoiceId')({
  // The invoice is a path segment rather than a search parameter: the router
  // JSON-encodes search values, and `?invoice=%222443%22` is not a link to
  // hand anybody. Every other URL in the app reads plainly and so does this.
  loader: ({ params }) => ({ invoiceId: params.invoiceId }),
  staticData: { title: 'Receipt', crumb: 'Finance · Fee collection', crumbTo: '/admin/collect' },
  component: ReceiptRoute,
})

/*
 * The id comes through the loader rather than off `useParams`. Reading the
 * match directly throws "could not find an active match" on the way out: React
 * renders this component once more as the next route takes over, and by then
 * the match it was reading is gone. Same reason the flow route guards its
 * loader data.
 */
function ReceiptRoute() {
  const loaded = Route.useLoaderData()
  if (!loaded) return null
  return <ReceiptPage invoiceId={loaded.invoiceId} />
}
