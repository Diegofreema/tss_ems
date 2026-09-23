import { useEffect } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { RemoteSelectField } from '@/components/form/remote-select-field'
import { SelectField } from '@/components/form/select-field'

type Filters = {
  klass: string
  arm: string
  term: string
  session: string
  released: string
}

/** The sentinel a select uses for "no filter" — Radix has no empty option. */
export const ALL_MARKS = 'all'

/**
 * What the broadsheet is drawn for.
 *
 * The class is not an optional filter — the endpoint requires it, because a
 * sheet is a class. The rest narrow it, and "released only" is the difference
 * between what the office can see and what a family can.
 */
export function SheetFilters({
  values,
  onChange,
}: {
  values: Filters
  onChange: (next: Filters) => void
}) {
  const form = useForm<Filters>({ defaultValues: values })
  const watched = useWatch({ control: form.control })

  // The URL is the state; this only mirrors what was picked into it.
  useEffect(() => {
    onChange({
      klass: watched.klass ?? '',
      // An arm belongs to a class, so changing the class abandons it rather
      // than drawing a sheet for an arm of somewhere else.
      arm: watched.arm ?? '',
      term: watched.term ?? '',
      session: watched.session ?? '',
      released: watched.released ?? ALL_MARKS,
    })
  }, [watched.klass, watched.arm, watched.term, watched.session, watched.released, onChange])

  return (
    <FormProvider {...form}>
      <form
        className="mb-[26px] grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[18px]"
        onSubmit={(event) => event.preventDefault()}
      >
        <RemoteSelectField<Filters>
          name="klass"
          label="Class"
          required
          from="classes"
          hint="A broadsheet covers one class."
        />
        <RemoteSelectField<Filters>
          name="arm"
          label="Arm"
          from="arms"
          dependsOn="klass"
          hint="Optional — the whole class without it."
        />
        <RemoteSelectField<Filters> name="term" label="Term" from="terms" />
        <RemoteSelectField<Filters> name="session" label="Session" from="sessions" />
        <SelectField<Filters>
          name="released"
          label="Marks shown"
          options={[
            { value: ALL_MARKS, label: 'All marks on file' },
            { value: 'released', label: 'Released only' },
          ]}
          hint="Released only is what a family sees."
        />
      </form>
    </FormProvider>
  )
}
