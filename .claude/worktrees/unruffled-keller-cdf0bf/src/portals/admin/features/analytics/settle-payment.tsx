import type { ReactNode } from 'react'
import { FormProvider, type UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { MoneyField } from '@/components/form/money-field'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { useCheckRrr, useRetryPayment } from '@/api/analytics/hooks'
import { useRecordForm } from '@/hooks/use-record-form'

/**
 * The two ways a payment the school never saw is chased up.
 *
 * A family pays, the gateway takes the money and the callback never arrives —
 * so the transaction sits unsettled and the invoice still reads owing. Both of
 * these ask the gateway what it knows about one reference and settle the
 * record here if it confirms. Neither takes money: nothing is charged, and a
 * reference the gateway has no record of changes nothing at all. That is why
 * they submit on one click, without a confirm in the way.
 */

const RETRY = z.object({
  payref: z.string().trim().min(1, 'Enter the Interswitch reference'),
  amount: z.string().trim().min(1, 'Enter the amount that was expected'),
})

// Remita issues twelve digits, and a mistyped RRR is a wasted lookup rather
// than an error the gateway explains.
const RRR = z.object({
  rrr: z
    .string()
    .trim()
    .regex(/^\d{12}$/, 'An RRR is twelve digits'),
})

type RetryValues = z.infer<typeof RETRY>
type RrrValues = z.infer<typeof RRR>

function SettleCard<TValues extends RetryValues | RrrValues>({
  title,
  description,
  form,
  onSubmit,
  pending,
  cta,
  children,
}: {
  title: string
  description: string
  form: UseFormReturn<TValues>
  onSubmit: (values: TValues) => void
  pending: boolean
  cta: string
  children: ReactNode
}) {
  return (
    <section className="border-2 border-divider p-5">
      <h5 className="font-heading text-[15px] font-extrabold">{title}</h5>
      <p className="mt-1 mb-4 text-[12.5px] text-muted-foreground">{description}</p>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[18px]">
            {children}
          </div>
          <Button className="mt-4" type="submit" pending={pending}>
            {cta}
          </Button>
        </form>
      </FormProvider>
    </section>
  )
}

export function SettlePayment() {
  const retry = useRetryPayment()
  const rrr = useCheckRrr()

  const retryForm = useRecordForm<RetryValues>(RETRY, { payref: '', amount: '' })
  const rrrForm = useRecordForm<RrrValues>(RRR, { rrr: '' })

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SettleCard
        title="Re-check an Interswitch payment"
        description="Asks Interswitch about a reference and settles it here if the amount matches."
        form={retryForm}
        pending={retry.isPending}
        cta="Re-check payment"
        onSubmit={(values) =>
          // Reset only once it has gone through, so a refused reference is
          // still on screen to be corrected rather than retyped.
          retry.mutate(values, { onSuccess: () => retryForm.reset() })
        }
      >
        <TextField<RetryValues>
          name="payref"
          label="Payment reference"
          placeholder="As Interswitch issued it"
          required
        />
        <MoneyField<RetryValues>
          name="amount"
          label="Expected amount"
          hint="What the invoice was raised for"
          required
        />
      </SettleCard>

      <SettleCard
        title="Check a Remita RRR"
        description="Asks Remita about an RRR and settles both the transaction and the invoice behind it."
        form={rrrForm}
        pending={rrr.isPending}
        cta="Check RRR"
        onSubmit={(values) => rrr.mutate(values, { onSuccess: () => rrrForm.reset() })}
      >
        <TextField<RrrValues>
          name="rrr"
          label="RRR"
          placeholder="12 digits"
          required
        />
      </SettleCard>
    </div>
  )
}
