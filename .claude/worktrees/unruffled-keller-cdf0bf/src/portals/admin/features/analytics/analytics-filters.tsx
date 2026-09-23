import { useEffect } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { SelectField } from '@/components/form/select-field'
import type { Option } from '@/features/collections/options'

type Filters = { session: string; subject: string }

/**
 * The session and subject the two comparisons are drawn for.
 *
 * Neither endpoint has a default: `financial-analytics` requires a session and
 * `result-analytics` requires both, so these are not optional filters — they
 * are the question being asked. A form rather than two loose selects, so they
 * are the same controls every other screen uses. It owns no state: every
 * change goes straight to the URL, which is what the page reads back.
 */
export function AnalyticsFilters({
  session,
  subject,
  sessions,
  subjects,
  onChange,
}: {
  session: string
  subject: string
  sessions: Option[]
  subjects: Option[]
  onChange: (next: Filters) => void
}) {
  const form = useForm<Filters>({ defaultValues: { session, subject } })
  const values = useWatch({ control: form.control })

  useEffect(() => {
    onChange({ session: values.session ?? '', subject: values.subject ?? '' })
  }, [values.session, values.subject, onChange])

  // The selects are told what was actually asked for, which on first load is
  // the session and subject the page fell back to rather than an empty box.
  useEffect(() => {
    if (session && session !== form.getValues('session')) form.setValue('session', session)
    if (subject && subject !== form.getValues('subject')) form.setValue('subject', subject)
  }, [session, subject, form])

  return (
    <FormProvider {...form}>
      <form
        className="mb-[26px] grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[18px]"
        onSubmit={(event) => event.preventDefault()}
      >
        <SelectField<Filters>
          name="session"
          label="Session"
          hint="Compared against the session before it"
          options={sessions}
        />
        <SelectField<Filters>
          name="subject"
          label="Subject"
          hint="Grades are compared one subject at a time"
          options={subjects}
        />
      </form>
    </FormProvider>
  )
}
