import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { DateField } from '@/components/form/date-field'
import { SelectField } from '@/components/form/select-field'
import { fromApiDate, toApiDate } from '@/features/collections/date-range'
import { optionsQuery } from '@/features/collections/option-feeds'
import { ANY, STATUSES } from './attendance'

type Filters = { start?: Date; end?: Date; klass: string; arm: string; status: string }

export type FilterValues = {
  start: string
  end: string
  klass: string
  arm: string
  status: string
}

const STATUS_OPTIONS = [
  { value: ANY, label: 'Any status' },
  ...STATUSES.map((status) => ({
    value: status,
    label: status[0].toUpperCase() + status.slice(1),
  })),
]

/**
 * What the report is asked for. A form rather than five loose controls, so the
 * range uses the same shadcn calendar every other date on the site uses. It
 * owns no state — every change goes straight to the URL, which the page reads.
 */
export function ReportFilters({
  start,
  end,
  klass,
  arm,
  status,
  onChange,
}: FilterValues & { onChange: (next: Partial<FilterValues>) => void }) {
  const form = useForm<Filters>({
    defaultValues: {
      start: fromApiDate(start),
      end: fromApiDate(end),
      klass: klass || ANY,
      arm: arm || ANY,
      status: status || ANY,
    },
  })
  const values = useWatch({ control: form.control })

  /*
   * The classes and arms come off the device's own sets, through the same
   * option feeds every form uses — the report used to ask
   * `attendances/departments` and `class-arms/for-department/{id}` for a
   * narrowed copy of registers `refClasses` and `refArms` already hold, and
   * with no connection both dropdowns sat empty, which is a report nobody can
   * filter. An arm only means something inside a class, so the arm feed is
   * scoped to whichever is chosen — and the whole school's where none is.
   */
  const chosenClass = values.klass && values.klass !== ANY ? values.klass : undefined
  const { data: classFeed } = useQuery(optionsQuery('classes', ''))
  const { data: allArms } = useQuery(optionsQuery('all-arms', ''))
  const { data: classArms } = useQuery(optionsQuery('arms', chosenClass ?? ''))

  const arms = chosenClass ? classArms : allArms
  const classes = [{ value: ANY, label: 'All classes' }, ...(classFeed ?? [])]
  const armOptions = [{ value: ANY, label: 'All arms' }, ...(arms ?? [])]

  // An arm that does not belong to the chosen class is not a choice, however
  // it got there — a shared link, or the class being changed under it.
  const { setValue } = form
  const stale =
    values.arm && values.arm !== ANY && arms && !arms.some((one) => one.value === values.arm)
  useEffect(() => {
    if (stale) setValue('arm', ANY)
  }, [stale, setValue])

  // The URL is the state; this only mirrors what was picked into it.
  useEffect(() => {
    const chosen = (value: string | undefined) => (value && value !== ANY ? value : '')
    onChange({
      start: toApiDate(values.start) ?? '',
      end: toApiDate(values.end) ?? '',
      klass: chosen(values.klass),
      arm: chosen(values.arm),
      status: chosen(values.status),
    })
  }, [values.start, values.end, values.klass, values.arm, values.status, onChange])

  return (
    <FormProvider {...form}>
      <form
        className="mb-6.5 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4.5"
        onSubmit={(event) => event.preventDefault()}
      >
        <DateField<Filters> name="start" label="From" past placeholder="Start of this month" />
        <DateField<Filters> name="end" label="To" past placeholder="Today" />
        <SelectField<Filters> name="klass" label="Class" options={classes} />
        <SelectField<Filters> name="arm" label="Arm" options={armOptions} />
        <SelectField<Filters> name="status" label="Status" options={STATUS_OPTIONS} />
      </form>
    </FormProvider>
  )
}
