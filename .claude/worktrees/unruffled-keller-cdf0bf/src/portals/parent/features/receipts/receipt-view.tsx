import { Printer } from 'lucide-react'
import type { Receipt } from '@/api/collect-fees/types'
import type { Parent } from '@/api/parents/types'
import { useSchoolSettings } from '@/api/settings/hooks'
import { Button } from '@/components/ui/button'
import { formatNaira } from '@/lib/format'
import { useSessionStore } from '@/stores/session.store'
import { amountInWords } from './amount-in-words'
import { receiptFields } from './receipt'

/** The printable official receipt: letterhead, figure, words, then the rows. */
export function ReceiptView({
  receipt,
  methods,
}: {
  receipt: Receipt
  methods?: Record<string, string>
}) {
  const { data: settings } = useSchoolSettings()
  const household = useSessionStore((state) => state.account)?.profile as
    | Parent
    | undefined

  // The slip carries the school's name itself; the rest of the letterhead is
  // the one settings row, and is left off rather than invented when it is
  // still loading.
  const school = receipt.school?.trim() || (settings?.name as string | undefined)
  const address = [settings?.address, settings?.phone]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="max-w-[640px]">
      <article className="border-2 border-foreground">
        <header className="border-b-2 border-foreground px-6 py-[22px]">
          <div className="flex items-start gap-4">
            <div className="size-[26px] flex-none bg-brand" aria-hidden />
            <div className="flex-1">
              <div className="font-heading text-base font-extrabold">{school}</div>
              {address && (
                <div className="mt-[3px] text-[11.5px] text-muted-foreground">
                  {address}
                </div>
              )}
            </div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              Official receipt
            </div>
          </div>

          {/* The reference identifies this page, so it is the heading — but the
              API mints it as one unbroken 37-character word, and beside the
              school's name it squeezed both into columns two words wide. It
              gets its own line instead. */}
          <h2 className="mt-3.5 font-heading text-[17px] font-extrabold break-all">
            {receipt.reference}
          </h2>
        </header>

        <div className="border-b-2 border-divider p-6">
          <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Amount received
          </div>
          {/* What was handed over, not what the invoice was closed for — a
              discount is not money the school took. */}
          <div className="mt-1.5 font-heading text-receipt font-extrabold tracking-[-0.02em] tabular-nums">
            {formatNaira(receipt.amount)}
          </div>
          <div className="mt-1.5 text-[13px] text-muted-foreground">
            {amountInWords(receipt.amount)}
          </div>
        </div>

        {receiptFields(receipt, household, methods).map((field, index) => (
          <div
            key={field.label}
            style={{ animationDelay: `${index * 26}ms` }}
            className="flex animate-ems-row gap-4 border-b border-divider px-6 py-3"
          >
            <div className="w-2/5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {field.label}
            </div>
            <div className="flex-1 text-sm tabular-nums">{field.value}</div>
          </div>
        ))}

        <footer className="flex flex-wrap items-end justify-between gap-5 px-6 py-5">
          <div className="max-w-[34ch] text-[11.5px] leading-relaxed text-muted-foreground">
            Computer generated. Valid without a signature. Query any receipt
            with the bursary within thirty days.
          </div>
          <div className="text-right">
            <div className="w-[130px] border-b-2 border-foreground" />
            <div className="mt-1.5 text-[11px] text-muted-foreground">Bursar</div>
          </div>
        </footer>
      </article>

      {/* Printing is the whole point of the slip, and the only thing this page
          can actually do with it — there is no endpoint that emails one or
          hands it over as a PDF. */}
      <div data-print-hide className="mt-5">
        <Button onClick={() => window.print()}>
          <Printer className="size-[15px]" strokeWidth={2} />
          Print this receipt
        </Button>
      </div>
    </div>
  )
}
