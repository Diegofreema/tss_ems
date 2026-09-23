import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useRef } from 'react'
import { myFamilyKeys } from '@/api/parents/keys'
import { usePaymentStatus, useVerifyPayment } from '@/api/payments/hooks'
import { EmptyState } from '@/components/feedback/empty-state'
import { Shimmer } from '@/components/feedback/shimmer'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { formatNaira } from '@/lib/format'
import { settled, stateCopy } from './outstanding'

/**
 * Where Credo returns the payer, with the reference on the query string.
 *
 * Two things happen here, in order. The reference is verified — which is what
 * actually settles the invoice, and is done server-to-server so nothing this
 * page could be told about the outcome is taken on trust. Then, only while
 * the payment has not finished moving, the local record is polled: a payer
 * can come back before Credo has settled, and "still clearing" is a real
 * answer rather than a failure.
 */
export function PayDonePage() {
  const queryClient = useQueryClient()
  const [reference] = useQueryState('reference', parseAsString.withDefault(''))
  const verify = useVerifyPayment()
  const outcome = verify.data?.status

  // Verified once. The endpoint is idempotent by design, so a second call
  // settles nothing twice — but a re-render is not a reason to make one.
  const asked = useRef(false)
  useEffect(() => {
    if (!reference || asked.current) return
    asked.current = true
    verify.mutate(reference, {
      onSuccess: () => {
        // A settled invoice changes the ledger and every figure drawn off it.
        void queryClient.invalidateQueries({ queryKey: ['parent', 'family'] })
        void queryClient.invalidateQueries({ queryKey: myFamilyKeys.all })
      },
    })
    // The ref is the guard, not the dependency list: `verify` changes identity
    // as the mutation moves, and re-running this must never mean re-verifying.
  }, [reference, verify, queryClient])

  // Polled only while it might still move, so a payment already settled by
  // the verify above costs no further request.
  const poll = usePaymentStatus(settled(outcome) ? null : reference || null)
  const payment = verify.data ?? poll.data
  const status = outcome ?? poll.data?.status
  const copy = stateCopy(status)

  const header = (
    <>
      <PageHeader
        kicker="Finance"
        title="Payment"
        description="What Credo told the school about your payment."
      />
      <Rule />
    </>
  )

  if (!reference) {
    return (
      <div className="mx-auto w-full max-w-[680px]">
        {header}
        <EmptyState
          title="There is no payment to confirm"
          body="This page only opens after a payment. Nothing was charged."
          action={
            <Button asChild>
              <Link to="/parent/pay">Pay an invoice</Link>
            </Button>
          }
        />
      </div>
    )
  }

  // Nothing is claimed until the first answer is in: saying "received" while
  // the request is still out would be a claim about somebody's money.
  if (verify.isPending && !payment) {
    return (
      <div className="mx-auto w-full max-w-[680px]">
        {header}
        <div className="rounded-lg border border-divider bg-raised p-6 shadow-card">
          <div className="font-heading text-lg font-extrabold">
            Confirming your payment
          </div>
          <p className="mt-1.5 mb-4 text-sm text-muted-foreground">
            Checking with Credo. This takes a moment and does not need the page
            kept open — the bursary is told either way.
          </p>
          <Shimmer className="h-2 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[680px]">
      {header}
      <div className="rounded-lg border border-divider bg-raised p-6 shadow-card">
        <div className="font-heading text-xl font-extrabold">{copy.title}</div>
        <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>

        <dl className="mt-5 border-t border-divider pt-4 text-sm">
          <div className="flex justify-between gap-4 border-b border-divider py-2">
            <dt className="text-muted-foreground">Reference</dt>
            <dd className="truncate font-mono text-xs">{reference}</dd>
          </div>
          {payment?.amount !== undefined && (
            <div className="flex justify-between gap-4 border-b border-divider py-2">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-heading font-extrabold tabular-nums">
                {formatNaira(payment.amount)}
              </dd>
            </div>
          )}
          {payment?.invoice_id !== undefined && (
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">Invoice</dt>
              <dd className="tabular-nums">#{payment.invoice_id}</dd>
            </div>
          )}
        </dl>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button asChild>
            <Link to="/parent/invoices">See your invoices</Link>
          </Button>
          {status === 'failed' && (
            <Button asChild variant="outline">
              <Link to="/parent/pay">Try again</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
