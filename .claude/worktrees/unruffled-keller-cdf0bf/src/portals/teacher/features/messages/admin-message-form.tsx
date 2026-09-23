import { FormProvider } from 'react-hook-form'
import { z } from 'zod'
import { useMessageAdmin } from '@/api/teaching/hooks'
import { FormErrorBanner } from '@/components/form/form-error-banner'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { useRecordForm } from '@/hooks/use-record-form'
import { MessageFields } from './message-fields'

/** `POST /teachers/me/message-admin` takes these two and nothing else. */
const schema = z.object({
  subject: z.string().trim().min(1, 'Required'),
  message: z.string().trim().min(1, 'Write your message.'),
})

type Values = z.infer<typeof schema>

const EMPTY: Values = { subject: '', message: '' }

/**
 * A note to the school office.
 *
 * There is no recipient to pick — the endpoint decides who at the office reads
 * it, and the teacher is resolved from the token — so the form is the two
 * fields the endpoint takes and nothing that only looks like a choice.
 */
export function AdminMessageForm() {
  const form = useRecordForm<Values>(schema, EMPTY)
  const send = useMessageAdmin()

  const submit = form.handleSubmit(async (values) => {
    // The refusal has already been announced by the mutation cache; what the
    // teacher wrote is left in the form so it is not lost with the toast.
    await send.mutateAsync(values).then(
      () => form.reset(EMPTY),
      () => undefined,
    )
  })

  return (
    <div className="max-w-[640px]">
      <PageHeader
        kicker="Messages"
        title="Message the admin"
        description="Goes to the school office. Use this for anything that needs a record."
      />
      <Rule />

      <FormProvider {...form}>
        <form noValidate onSubmit={submit}>
          <FormErrorBanner count={Object.keys(form.formState.errors).length} />

          <div className="flex flex-col gap-4">
            <MessageFields<Values> bodyHint="The office sees this beside your name." />

            <div>
              <Button type="submit" pending={send.isPending}>
                Send to the office
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
