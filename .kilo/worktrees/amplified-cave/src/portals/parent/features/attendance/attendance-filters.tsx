import { useEffect } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { DateField } from '@/components/form/date-field'
import { fromApiDate, toApiDate } from '@/features/collections/date-range'

type Filters = { start?: Date; end?: Date }

/**
 * The range the register is asked for.
 *
 * A form rather than two loose controls, so the dates use the same shadcn
 * calendar every other date on the site uses. It owns no state — every change
 * goes straight to the URL, which is what the page reads.
 */
export function AttendanceFilters({
  start,
  end,
  onChange,
}: {
  start: string
  end: string
  onChange: (next: { start?: string; end?: string }) => void
}) {
  const form = useForm<Filters>({
    defaultValues: { start: fromApiDate(start), end: fromApiDate(end) },
  })
  const values = useWatch({ control: form.control })

  useEffect(() => {
    onChange({
      start: toApiDate(values.start) ?? '',
      end: toApiDate(values.end) ?? '',
    })
  }, [values.start, values.end, onChange])

  return (
    <FormProvider {...form}>
      <form
        className="mb-6.5 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4.5"
        onSubmit={(event) => event.preventDefault()}
      >
        <DateField<Filters>
          name="start"
          label="From"
          past
          placeholder="Start of this month"
        />
        <DateField<Filters> name="end" label="To" past placeholder="Today" />
      </form>
    </FormProvider>
  )
}
