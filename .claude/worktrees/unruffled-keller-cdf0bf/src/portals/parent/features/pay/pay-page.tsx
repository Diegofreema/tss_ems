import { Link } from '@tanstack/react-router'
import { parseAsString, useQueryState } from 'nuqs'
import { useGatewayConfig, useInitialisePayment } from '@/api/payments/hooks'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { BackLink } from '@/components/page/back-link'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useConfirm } from '@/hooks/use-confirm'
import { cn } from '@/lib/utils'
import { callbackUrl, gatewayWarning, outstandingFor } from './outstanding'
import { useFamily } from '../../parent.store'

/**
 * Paying one invoice by card or transfer, through Credo.
 *
 * There is no amount to type and no method to pick. The server reads the
 * amount off the invoice and refuses anything that does not cover it, and
 * Credo's own page is where card and bank are chosen — so what is left here
 * is choosing which bill to settle.
 */
export function PayPage() {
  const confirm = useConfirm()
  const outstanding = outstandingFor(useFamily())
  const gateway = useGatewayConfig()
  const open = useInitialisePayment()

  // Empty rather than the first invoice: the default is read once, and the
  // list is fetched, so a default built from it would stick at whatever the
  // first render happened to hold.
  const [invoiceId, setInvoiceId] = useQueryState('invoice', parseAsString.withDefault(''))
  const chosen = outstanding.find((entry) => entry.id === invoiceId) ?? outstanding[0]
  const warning = gatewayWarning(gateway.data)

  const pay = () => {
    if (!chosen) return
    confirm.ask({
      title: 'Pay this invoice?',
      body: 'You will be taken to Credo to pay by card or bank transfer. The amount is the invoice’s own and cannot be changed. A refund has to go through the bursary.',
      subject: `${chosen.balance} · ${chosen.invoice} · ${chosen.child}`,
      cancel: 'Go back',
      cta: 'Continue to payment',
      onConfirm: async () => {
        const session = await open
          .mutateAsync({
            invoice_id: Number(chosen.id),
            callback_url: callbackUrl(window.location.origin),
          })
          .catch(() => null)
        // A refusal has already been announced by the mutation cache; there is
        // nowhere to send the payer, so the page simply stays put.
        if (!session?.authorization_url) return
        // Leaving the app entirely — Credo hosts the card form, and it is
        // theirs to host precisely so no card detail ever reaches this origin.
        window.location.assign(session.authorization_url)
      },
    })
  }

  return (
    <div className="max-w-[680px]">
      <BackLink to="/parent" label="Back to dashboard" />
      <PageHeader
        kicker="Finance"
        title="Pay fees"
        description="One invoice at a time, by card or bank transfer. The amount is the invoice’s own — part payments are not taken online."
      />
      <Rule />

      {warning && (
        <div className="mb-5 border-2 border-brand px-4 py-3.5 text-[13px]">
          {warning}
        </div>
      )}

      <div className="mb-5">
        <Label className="mb-[5px] block text-xs font-normal text-foreground/70">
          Invoice
        </Label>
        <div
          role="radiogroup"
          aria-label="Invoice"
          className="flex flex-col overflow-hidden border-2 border-divider bg-background"
        >
          {outstanding.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={entry.id === chosen?.id}
              onClick={() => void setInvoiceId(entry.id)}
              className={cn(
                'flex cursor-pointer items-center gap-3.5 border-b-2 border-divider px-4 py-3.5 text-left text-sm transition-colors last:border-b-0 hover:bg-neutral-200',
                entry.id === chosen?.id ? 'bg-brand/10' : 'bg-background',
              )}
            >
              <span
                className={cn(
                  'size-[18px] flex-none rounded-full border-2',
                  entry.id === chosen?.id
                    ? 'border-brand bg-brand'
                    : 'border-divider bg-transparent',
                )}
              />
              <span className="flex-1">
                <span className="font-semibold">{entry.fee}</span>
                <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                  {entry.child} · {entry.invoice}
                </span>
              </span>
              <span className="font-heading font-extrabold tabular-nums">
                {entry.balance}
              </span>
            </button>
          ))}

          {outstanding.length === 0 && (
            <div className="px-6 py-12 text-center">
              <div className="font-heading text-[17px] font-extrabold">
                Nothing outstanding
              </div>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Every invoice raised against your children has been settled.
              </p>
            </div>
          )}
        </div>
      </div>
      <Rule />

      <div className="flex flex-wrap items-center gap-2.5">
        {chosen && (
          <Button onClick={pay} pending={open.isPending}>
            Pay {chosen.balance}
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/parent/invoices">See all invoices</Link>
        </Button>
      </div>

      <ConfirmDialog request={confirm.request} onOpenChange={confirm.setOpen} />
    </div>
  )
}
