import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { DateField } from '@/components/form/date-field'
import { SelectField } from '@/components/form/select-field'
import { optionsQuery } from '@/features/collections/option-feeds'
import { fromApiDate, toApiDate } from '@/features/collections/date-range'
import { ANY_METHOD } from './report'

type Filters = { start?: Date; end?: Date; method: string }

/**
 * The range and method the report is asked for.
 *
 * A form rather than three loose controls, so the range uses the same shadcn
 * calendar every other date on the site uses. It owns no state of its own —
 * every change goes straight to the URL, which is what the page reads.
 */
export function ReportFilters({
  start,
  end,
  method,
  onChange,
}: {
  start: string
  end: string
  method: string
  onChange: (next: { start?: string; end?: string; method?: string }) => void
}) {
  const form = useForm<Filters>({
    defaultValues: {
      start: fromApiDate(start),
      end: fromApiDate(end),
      method: method || ANY_METHOD,
    },
  })
  const values = useWatch({ control: form.control })

  const { data } = useQuery(optionsQuery('payment-methods', ''))
  const options = [
    { value: ANY_METHOD, label: 'All methods' },
    ...(data ?? []),
  ]

  // The URL is the state; this only mirrors what was picked into it.
  useEffect(() => {
    onChange({
      start: toApiDate(values.start) ?? '',
      end: toApiDate(values.end) ?? '',
      // The sentinel means no filter, so it is cleared from the URL rather
      // than written into every link this page is shared with.
      method: values.method && values.method !== ANY_METHOD ? values.method : '',
    })
  }, [values.start, values.end, values.method, onChange])

  return (
    <FormProvider {...form}>
      <form
        className="mb-[26px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[18px]"
        onSubmit={(event) => event.preventDefault()}
      >
        <DateField<Filters>
          name="start"
          label="From"
          past
          placeholder="Start of this month"
        />
        <DateField<Filters> name="end" label="To" past placeholder="Today" />
        <SelectField<Filters> name="method" label="Method" options={options} />
      </form>
    </FormProvider>
  )
}
