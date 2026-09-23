import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { SelectField } from '@/components/form/select-field'
import { optionsQuery } from '@/features/collections/option-feeds'

type Filters = { session: string; term: string }

/** The sentinel a select uses for "no filter" — Radix has no empty option. */
export const ANY = 'all'

/**
 * Which session and term the sheet is asked for.
 *
 * Both are read from the school's own registers rather than listed here: a
 * school opens a new session every year, and a page that named them would
 * stop offering the current one the moment it did.
 *
 * It owns no state — every change goes straight to the URL, which is what the
 * page reads and what a shared link carries.
 */
export function ResultsFilters({
  session,
  term,
  onChange,
}: {
  session: string
  term: string
  onChange: (next: { session?: string; term?: string }) => void
}) {
  const form = useForm<Filters>({
    defaultValues: { session: session || ANY, term: term || ANY },
  })
  const values = useWatch({ control: form.control })

  const sessions = useQuery(optionsQuery('sessions', ''))
  const terms = useQuery(optionsQuery('terms', ''))

  useEffect(() => {
    onChange({
      // The sentinel means no filter, so it is cleared from the URL rather
      // than written into every link this page is shared with.
      session: values.session && values.session !== ANY ? values.session : '',
      term: values.term && values.term !== ANY ? values.term : '',
    })
  }, [values.session, values.term, onChange])

  return (
    <FormProvider {...form}>
      <form
        className="mb-6.5 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4.5"
        onSubmit={(event) => event.preventDefault()}
      >
        <SelectField<Filters>
          name="session"
          label="Session"
          options={[{ value: ANY, label: 'Every session' }, ...(sessions.data ?? [])]}
        />
        <SelectField<Filters>
          name="term"
          label="Term"
          options={[{ value: ANY, label: 'Every term' }, ...(terms.data ?? [])]}
        />
      </form>
    </FormProvider>
  )
}
