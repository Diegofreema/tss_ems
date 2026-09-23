import { useQueryState } from 'nuqs'
import { Controller, FormProvider } from 'react-hook-form'
import { z } from 'zod'
import { useMessageMyStudents, useMyStudents } from '@/api/teaching/hooks'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { FormErrorBanner } from '@/components/form/form-error-banner'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { useRecordForm } from '@/hooks/use-record-form'
import { ALL } from '../../collections/mine'
import { MessageFields } from './message-fields'
import { RecipientPicker } from './recipient-picker'
import { armOptions, recipientsIn } from './recipients'

/** `POST /teachers/me/message-students` — the two fields plus who gets it. */
const schema = z.object({
  student_ids: z.array(z.number()).min(1, 'Pick at least one pupil.'),
  subject: z.string().trim().min(1, 'Required'),
  message: z.string().trim().min(1, 'Write your message.'),
})

type Values = z.infer<typeof schema>

const EMPTY: Values = { student_ids: [], subject: '', message: '' }

/**
 * A message to pupils the teacher picks.
 *
 * The arms and the roll are one read — `GET /teachers/me/students` answers
 * both — so the picker needs no second request when the arm changes. Which arm
 * is on screen and what the search box holds live in the URL, so a half-written
 * message survives a reload on the arm it was being written to.
 */
export function StudentsMessageForm() {
  const roll = useMyStudents({ limit: ALL })
  const send = useMessageMyStudents()
  const form = useRecordForm<Values>(schema, EMPTY)
  const [chosenArm, setArm] = useQueryState('arm')
  const [query, setQuery] = useQueryState('q', { defaultValue: '' })

  const data = roll.data
  if (!data) {
    return (
      <>
        <Header />
        {roll.isError ? (
          // Without the roll there is nobody to pick, so this says why rather
          // than showing an empty arm the teacher would take for the truth.
          <EmptyState
            title="Your roll could not be read"
            body={errorMessage(roll.error, OFFLINE_MESSAGE)}
          />
        ) : (
          <TableSkeleton rows={6} />
        )}
      </>
    )
  }

  const arms = armOptions(data)

  if (arms.length === 0) {
    return (
      <>
        <Header />
        <EmptyState
          title="You do not take an arm yet"
          body="Messages go to the pupils in an arm you are class teacher of. The school office assigns arms."
        />
      </>
    )
  }

  // The first arm until one is picked, and again if the URL names an arm the
  // office has since taken off this teacher.
  const armId = arms.find((arm) => arm.value === chosenArm)?.value ?? arms[0].value
  const pupils = recipientsIn(data, Number(armId))

  const submit = form.handleSubmit(async (values) => {
    await send.mutateAsync(values).then(
      () => {
        form.reset(EMPTY)
        void setQuery('')
      },
      // Announced by the mutation cache. The message and the pupils picked
      // stay put, so a refusal costs nothing already typed.
      () => undefined,
    )
  })

  const chosen = form.watch('student_ids')

  return (
    <div className="max-w-[720px]">
      <Header />

      <FormProvider {...form}>
        <form noValidate onSubmit={submit}>
          <FormErrorBanner count={Object.keys(form.formState.errors).length} />

          <div className="flex flex-col gap-4">
            <Controller
              control={form.control}
              name="student_ids"
              render={({ field, fieldState }) => (
                <RecipientPicker
                  arms={arms}
                  armId={armId}
                  onArmChange={(value) => void setArm(value)}
                  pupils={pupils}
                  query={query}
                  onQueryChange={(value) => void setQuery(value)}
                  chosen={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            <MessageFields<Values> bodyHint="Each pupil picked above receives this in their portal." />

            <div>
              <Button type="submit" pending={send.isPending}>
                {chosen.length
                  ? `Send to ${chosen.length} pupil${chosen.length === 1 ? '' : 's'}`
                  : 'Send message'}
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}

function Header() {
  return (
    <>
      <PageHeader
        kicker="Messages"
        title="Message my students"
        description="Pick an arm, then the pupils in it. Search to narrow the list; picking in one arm survives a move to another."
      />
      <Rule />
    </>
  )
}
