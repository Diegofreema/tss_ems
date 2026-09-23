import { useQuery } from '@tanstack/react-query'
import { paymentMethods } from '@/api/collect-fees/hooks'
import { collectFeeKeys } from '@/api/collect-fees/keys'
import { collectFeesService } from '@/api/collect-fees/service'
import { SectionHeading } from '@/components/common/section-heading'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { ReceiptView } from './receipt-view'

/**
 * The receipt for an invoice that has been paid, under the invoice itself.
 *
 * There is no list of receipts to browse: a slip is issued against one
 * invoice, so the invoice is where it belongs. Only a settled invoice asks for
 * one, and even then the school may have no payment recorded behind it — every
 * bill settled before the counter kept transactions is like that — so a
 * refusal is said in a line rather than dressed up as an error.
 */
export function InvoiceReceipt({ invoiceId }: { invoiceId: string }) {
  const { data, isPending, error } = useQuery({
    queryKey: collectFeeKeys.receipt(invoiceId),
    queryFn: async () => ({
      receipt: (await collectFeesService.receipt(invoiceId)).receipt,
      // Names the method — "Bank Transfer" for `bank_transfer`. Allowed to
      // fail: it costs the slip a word, not a figure.
      methods: await paymentMethods().catch(() => undefined),
    }),
    // A receipt records something that already happened; asking again on every
    // focus is asking the same question of the same answer.
    staleTime: Infinity,
    retry: false,
  })

  return (
    <section className="mt-9">
      <SectionHeading className="mb-4">Receipt</SectionHeading>
      {isPending ? (
        <div className="text-sm text-muted-foreground">Fetching the receipt…</div>
      ) : error ? (
        // The API's own words: it tells an invoice with no payment behind it
        // apart from one it cannot find at all.
        <div className="text-sm text-muted-foreground">
          {errorMessage(error, OFFLINE_MESSAGE)}
        </div>
      ) : (
        <ReceiptView receipt={data.receipt} methods={data.methods} />
      )}
    </section>
  )
}
