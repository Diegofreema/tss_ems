import { FormProvider } from 'react-hook-form'
import { z } from 'zod'
import { enqueue } from '@/db/drain'
import { WRITE } from '@/db/ids'
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

  const submit = form.handleSubmit(async (values) => {
    // Sent to the school; kept on the device where there is no signal, so a
    // note written in a corridor goes when the signal comes back rather than
    // being thrown away at the button. The queue's toast says "saved on this
    // device" only then.
    const outcome = await enqueue({
      handler: WRITE.messageAdmin,
      payload: values,
      toast: { success: 'Message sent to the office' },
      label: 'Message to the office',
    })
    // Refused: the words stay in the box rather than being cleared over it.
    if (outcome === 'refused') return
    form.reset(EMPTY)
  })

  return (
    <div className="mx-auto w-full max-w-[640px]">
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
              <Button type="submit">
                Send to the office
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
