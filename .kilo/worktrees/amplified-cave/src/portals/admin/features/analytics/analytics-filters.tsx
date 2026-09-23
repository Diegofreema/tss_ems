import { useEffect } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { SelectField } from '@/components/form/select-field'
import type { Option } from '@/features/collections/options'
import { LIMITS } from './analytics'

export type Filters = { session: string; subject: string; limit: string }

/** Which of the three the open tab actually sends. */
export type FilterField = keyof Filters

/**
 * The filters the open tab's endpoints take, and only those.
 *
 * None of them is optional decoration: `financial-analytics` requires a
 * session, `result-analytics` requires a session and a subject, and
 * `payments` takes a session and a row count. Showing a subject select beside
 * the money charts would offer a filter that changes nothing, which is the
 * busyness the tabs are here to end.
 *
 * A form rather than loose selects, so they are the same controls every other
 * screen uses. It owns no state: every change goes straight to the URL, which
 * is what the page reads back.
 */
export function AnalyticsFilters({
  fields,
  values,
  sessions,
  subjects,
  onChange,
}: {
  fields: readonly FilterField[]
  values: Filters
  sessions: Option[]
  subjects: Option[]
  onChange: (next: Filters) => void
}) {
  const form = useForm<Filters>({ defaultValues: values })
  const watched = useWatch({ control: form.control })

  useEffect(() => {
    onChange({
      session: watched.session ?? '',
      subject: watched.subject ?? '',
      limit: watched.limit ?? '',
    })
  }, [watched.session, watched.subject, watched.limit, onChange])

  // The selects are told what was actually asked for, which on first load is
  // the session and subject the page fell back to rather than an empty box.
  useEffect(() => {
    for (const [name, value] of Object.entries(values) as [FilterField, string][]) {
      if (value && value !== form.getValues(name)) form.setValue(name, value)
    }
  }, [values, form])

  return (
    <FormProvider {...form}>
      <form
        className="mb-6.5 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4.5"
        onSubmit={(event) => event.preventDefault()}
      >
        {fields.includes('session') && (
          <SelectField<Filters>
            name="session"
            label="Session"
            hint="Compared against the session before it"
            options={sessions}
          />
        )}
        {fields.includes('subject') && (
          <SelectField<Filters>
            name="subject"
            label="Subject"
            hint="Grades are compared one subject at a time"
            options={subjects}
          />
        )}
        {fields.includes('limit') && (
          <SelectField<Filters>
            name="limit"
            label="Transactions to list"
            hint="How far back the settled list reaches"
            options={LIMITS}
          />
        )}
      </form>
    </FormProvider>
  )
}
