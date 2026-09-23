import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useEffect } from 'react'
import { useAttendanceDashboard } from '@/api/attendance/hooks'
import { DataTable } from '@/components/data-table/data-table'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { DateField } from '@/components/form/date-field'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { TileStrip } from '@/components/page/tile-strip'
import { Button } from '@/components/ui/button'
import { toTableColumns } from '@/features/collections/components/collection-columns'
import { fromApiDate, toApiDate } from '@/features/collections/date-range'
import type { Row } from '@/features/collections/types'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { classCountRow, dashboardTiles, day } from './attendance'

const COLUMNS = toTableColumns([
  { key: 'klass', label: 'Class', cardRole: 'title' },
  { key: 'roll', label: 'On roll', align: 'right' },
  { key: 'present', label: 'Present', align: 'right' },
  { key: 'rate', label: 'Rate', align: 'right' },
])

const rowKey = (row: Row) => row.id

/**
 * Who was marked present today, class by class.
 *
 * One day at a time, because that is the question the office asks before
 * break: which registers have come in. Anything over a range is the report,
 * which this page hands the chosen day to.
 */
export function AttendanceDashboard() {
  const [date, setDate] = useQueryState('date', parseAsString.withDefault(''))
  const { data, isPending, error, fetchStatus, refetch } = useAttendanceDashboard(
    date || undefined,
  )

  // The day the endpoint answered for, which is today where none was asked
  // for — so the link and the heading below say the same day the table does.
  const answered = data?.date ?? date

  const header = (
    <>
      <PageHeader
        kicker="Students"
        title="Attendance"
        description="The registers taken on one day, class by class. Marks are entered by the form teacher; this page only reads them."
        action={
          <Button asChild variant="outline">
            <Link
              to="/admin/att-report"
              search={answered ? { start: answered, end: answered } : {}}
            >
              Open the full report
              <ChevronRight className="size-3.5" strokeWidth={2} />
            </Link>
          </Button>
        }
      />
      <Rule />
      <DayPicker date={date} onChange={(next) => void setDate(next || null)} />
    </>
  )

  const paused = fetchStatus === 'paused'
  if (error || (paused && !data)) {
    return (
      <div className="max-w-[900px]">
        {header}
        <EmptyState
          title="Attendance could not load"
          body={error ? errorMessage(error, OFFLINE_MESSAGE) : OFFLINE_MESSAGE}
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="max-w-[900px]">
        {header}
        <TableSkeleton rows={6} />
      </div>
    )
  }

  const rows = data.today.map(classCountRow)

  return (
    <div className="max-w-[900px]">
      {header}

      <div className="mb-2 text-[12.5px] text-muted-foreground">{day(answered)}</div>
      <TileStrip className="mb-2.5" tiles={dashboardTiles(data)} />
      {/* A class nobody has marked and a class where everyone is away both
          come back as nought present, and the endpoint gives no way to tell
          them apart — so the page does not claim to. */}
      <div className="mb-[26px] text-[12.5px] text-muted-foreground">
        A class showing none present either has not been marked yet or had
        nobody in. The report says which.
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No classes to show"
          body="The school has no classes with pupils on the roll, so there is nothing to mark."
        />
      ) : (
        <DataTable columns={COLUMNS} rows={rows} rowKey={rowKey} compact />
      )}
    </div>
  )
}

type Picked = { date?: Date }

/** The one control on the page, on the same calendar as every other date. */
function DayPicker({
  date,
  onChange,
}: {
  date: string
  onChange: (next: string) => void
}) {
  const form = useForm<Picked>({ defaultValues: { date: fromApiDate(date) } })
  const values = useWatch({ control: form.control })

  // The URL is the state; this only mirrors what was picked into it.
  useEffect(() => {
    onChange(toApiDate(values.date) ?? '')
  }, [values.date, onChange])

  return (
    <FormProvider {...form}>
      <form
        className="mb-[26px] grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[18px]"
        onSubmit={(event) => event.preventDefault()}
      >
        <DateField<Picked> name="date" label="Day" past placeholder="Today" />
      </form>
    </FormProvider>
  )
}
