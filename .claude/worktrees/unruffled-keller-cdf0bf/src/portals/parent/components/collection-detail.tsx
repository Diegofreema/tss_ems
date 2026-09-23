import { CollectionDetail as SharedCollectionDetail } from '@/features/collections/components/collection-detail'
import type { CollectionDef, Row } from '@/features/collections/types'
import { parentCollectionRoutes } from '../collections/routes'
import { InvoiceReceipt } from '../features/receipts/invoice-receipt'

export function CollectionDetail({
  definition,
  record,
}: {
  definition: CollectionDef
  /** Undefined where the record was asked for and did not come back. */
  record?: Row
}) {
  // A paid invoice carries its receipt underneath it. Nowhere else does — a
  // slip is issued against one invoice, so the invoice is the only page that
  // has what it takes to ask for one.
  const paidInvoice = definition.id === 'invoices' && record?.state === 'Paid'

  return (
    <>
      <SharedCollectionDetail
        definition={definition}
        record={record}
        routes={parentCollectionRoutes}
      />
      {paidInvoice && record && <InvoiceReceipt invoiceId={record.id} />}
    </>
  )
}
