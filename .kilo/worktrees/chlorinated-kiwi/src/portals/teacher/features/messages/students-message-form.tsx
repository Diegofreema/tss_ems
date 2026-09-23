import { useQueryState } from 'nuqs'
import { Controller, FormProvider } from 'react-hook-form'
import { z } from 'zod'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { FormErrorBanner } from '@/components/form/form-error-banner'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { collectionError } from '@/db/collection'
import { teacherArms, teacherRoll } from '@/db/collections/teaching'
import { enqueue } from '@/db/drain'
import { SET, WRITE } from '@/db/ids'
import { useHeld } from '@/db/live'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { useRecordForm } from '@/hooks/use-record-form'
import { MessageFields } from './message-fields'
import { RecipientPicker } from './recipient-picker'
import { armOptions, recipientsIn } from './recipients'

/** `POST /teachers/me/message-students` — the two fields plus who gets it. */
const schema = z.object({
  student_ids: z.array(z.number()).min(1, 'Pick at least one student.'),
  subject: z.string().trim().min(1, 'Required'),
  message: z.string().trim().min(1, 'Write your message.'),
})

type Values = z.infer<typeof schema>

const EMPTY: Values = { student_ids: [], subject: '', message: '' }

/**
 * A message to students the teacher picks.
 *
 * The arms and the roll are one read — `GET /teachers/me/students` answers
 * both — so the picker needs no second request when the arm changes. Which arm
 * is on screen and what the search box holds live in the URL, so a half-written
 * message survives a reload on the arm it was being written to.
 */
export function StudentsMessageForm() {
  // The roll and the arms off the device's own sets — the same two halves
  // `GET /teachers/me/students` answers with, already synced by the shell, so
  // the picker fills with no connection. The send is queued for the same
  // reason: a message written in a staffroom with no signal goes when the
  // signal comes back rather than being thrown away at the button.
  const roll = useHeld(teacherRoll)
  const armsHeld = useHeld(teacherArms)
  const form = useRecordForm<Values>(schema, EMPTY)
  const [chosenArm, setArm] = useQueryState('arm')
  const [query, setQuery] = useQueryState('q', { defaultValue: '' })

  if (roll.pending || armsHeld.pending || roll.failed || armsHeld.failed) {
    return (
      <>
        <Header />
        {roll.failed || armsHeld.failed ? (
          // Without the roll there is nobody to pick, so this says why rather
          // than showing an empty arm the teacher would take for the truth.
          <EmptyState
            title="Your roll could not be read"
            body={errorMessage(
              collectionError(SET.teachingStudents) ?? collectionError(SET.teachingArms),
              OFFLINE_MESSAGE,
            )}
          />
        ) : (
          <TableSkeleton rows={6} />
        )}
      </>
    )
  }

  const data = { items: roll.rows, class_arms: armsHeld.rows }
  const arms = armOptions(data)

  if (arms.length === 0) {
    return (
      <>
        <Header />
        <EmptyState
          title="You do not take an arm yet"
          body="Messages go to the students in an arm you are class teacher of. The school office assigns arms."
        />
      </>
    )
  }

  // The first arm until one is picked, and again if the URL names an arm the
  // office has since taken off this teacher.
  const armId = arms.find((arm) => arm.value === chosenArm)?.value ?? arms[0].value
  const students = recipientsIn(data, Number(armId))

  const submit = form.handleSubmit(async (values) => {
    // Sent to the school, and kept on the device only if it could not be — the
    // toast is the queue's own, and says "saved on this device" only then.
    const outcome = await enqueue({
      handler: WRITE.messageStudents,
      payload: values,
      toast: { success: 'Message sent to your students' },
      label: 'Message to your students',
    })
    // A message the school refused is still on the screen that wrote it, with
    // the words in it. Emptying the form would be the one unrecoverable answer.
    if (outcome === 'refused') return
    form.reset(EMPTY)
    void setQuery('')
  })

  const chosen = form.watch('student_ids')

  return (
    <div className="mx-auto w-full max-w-[720px]">
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
                  students={students}
                  query={query}
                  onQueryChange={(value) => void setQuery(value)}
                  chosen={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            <MessageFields<Values> bodyHint="Each student picked above receives this in their portal." />

            <div>
              <Button type="submit">
                {chosen.length
                  ? `Send to ${chosen.length} student${chosen.length === 1 ? '' : 's'}`
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
        description="Pick an arm, then the students in it. Search to narrow the list; picking in one arm survives a move to another."
      />
      <Rule />
    </>
  )
}
