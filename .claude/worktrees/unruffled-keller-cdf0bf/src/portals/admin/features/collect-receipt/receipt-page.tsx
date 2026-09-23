import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Printer } from 'lucide-react'
import { paymentMethods } from '@/api/collect-fees/hooks'
import { collectFeeKeys } from '@/api/collect-fees/keys'
import { collectFeesService } from '@/api/collect-fees/service'
import { BackLink } from '@/components/page/back-link'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { receiptLines, receiptTotal } from './receipt'

/**
 * The slip for a payment taken at the counter.
 *
 * Its own page rather than a dialog, because the point of it is paper: the
 * print stylesheet hides the app around it and leaves this frame alone.
 */
export function ReceiptPage({ invoiceId }: { invoiceId: string }) {

  const { data, isPending, error, fetchStatus, refetch } = useQuery({
    queryKey: collectFeeKeys.receipt(invoiceId),
    queryFn: async () => ({
      issued: await collectFeesService.receipt(invoiceId),
      methods: await paymentMethods().catch(() => undefined),
    }),
    // A receipt is a record of something that already happened; asking again
    // on every focus would be asking the same question of the same answer.
    staleTime: Infinity,
    retry: false,
  })

  const header = (
    <div data-print-hide>
      <BackLink to="/admin/collect" label="Back to fee collection" />
      <PageHeader
        kicker="Finance · Fee collection"
        title="Receipt"
        description="The slip for one payment. Print it for the family — the page around it is left off the paper."
      />
      <Rule />
    </div>
  )

  if (error || (fetchStatus === 'paused' && !data)) {
    return (
      <div className="max-w-[640px]">
        {header}
        {/* The API's own words: it distinguishes an invoice that does not
            exist from one settled before the counter recorded transactions,
            and the second is the one a bursar needs explaining. */}
        <EmptyState
          title="No receipt for this invoice"
          body={error ? errorMessage(error, OFFLINE_MESSAGE) : OFFLINE_MESSAGE}
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="max-w-[640px]">
        {header}
        <TableSkeleton rows={6} />
      </div>
    )
  }

  const { issued, methods } = data
  const { receipt } = issued

  return (
    <div className="max-w-[640px]">
      {header}

      <div data-slot="receipt" className="border-2 border-divider bg-background">
        <div className="border-b-2 border-divider px-5 py-[18px]">
          <div className="text-[10px] uppercase tracking-[0.12em] text-brand-700">
            {receipt.school ?? 'Fee receipt'}
          </div>
          <h3 className="mt-2 font-heading text-[22px] font-extrabold leading-tight">
            {receiptTotal(receipt)}
          </h3>
          {/* The reference is what a parent quotes back when they query the
              payment, so it sits under the figure rather than in the table. */}
          <div className="mt-1.5 break-all text-[12px] text-muted-foreground">
            {receipt.reference}
          </div>
        </div>

        <div className="px-5 py-1">
          {receiptLines(receipt, methods).map((line) => (
            <div
              key={line.label}
              className="flex gap-3.5 border-b border-divider py-[11px] last:border-b-0"
            >
              <div className="w-[45%] text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                {line.label}
              </div>
              <div className="flex-1 text-[13.5px] tabular-nums">{line.value}</div>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-divider px-5 py-3.5 text-[11.5px] text-muted-foreground">
          Issued by {receipt.school ?? 'the school'}. Keep this slip — it is the
          school's record of the payment as well as yours.
        </div>
      </div>

      <div data-print-hide className="mt-5 flex flex-wrap gap-2.5">
        <Button onClick={() => window.print()}>
          <Printer className="size-[15px]" strokeWidth={2} />
          Print receipt
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/collect">Back to fee collection</Link>
        </Button>
      </div>
    </div>
  )
}
