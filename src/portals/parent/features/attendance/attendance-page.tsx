import { useQuery } from '@tanstack/react-query'
import { parseAsString, useQueryStates } from 'nuqs'
import { useCallback } from 'react'
import { myFamilyKeys } from '@/api/parents/keys'
import { myFamilyService } from '@/api/parents/service'
import { DataTable } from '@/components/data-table/data-table'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { TileStrip } from '@/components/page/tile-strip'
import { Button } from '@/components/ui/button'
import { toTableColumns } from '@/features/collections/components/collection-columns'
import { rangeLabel } from '@/features/collections/date-range'
import type { Row } from '@/features/collections/types'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import type { Child } from '../../family'
import { attendanceParams, attendanceTiles, markRow } from './attendance'
import { AttendanceFilters } from './attendance-filters'

const COLUMNS = toTableColumns([
  { key: 'date', label: 'Date', cardRole: 'title' },
  { key: 'day', label: 'Day', cardRole: 'subtitle' },
  { key: 'state', label: 'Mark', tag: true, cardRole: 'tag' },
  { key: 'note', label: 'Note' },
])

const rowKey = (row: Row) => row.id

/**
 * One child's daily marks, over a range.
 *
 * Its own page rather than one of the generic registers because the figures
 * over it — days marked, present, absent, the rate — are the API's own and
 * move with the dates.
 */
export function AttendancePage({ child }: { child: Child }) {
  const [filters, setFilters] = useQueryStates({
    start: parseAsString.withDefault(''),
    end: parseAsString.withDefault(''),
  })

  const params = attendanceParams(filters)
  const { data, isPending, error, fetchStatus, refetch } = useQuery({
    queryKey: myFamilyKeys.childAttendance(child.id, params),
    queryFn: () => myFamilyService.childAttendance(child.id, params),
    enabled: child.id > 0,
  })

  const onChange = useCallback(
    (next: { start?: string; end?: string }) => void setFilters(next),
    [setFilters],
  )

  const header = (
    <>
      <PageHeader
        kicker="My children"
        title={`Attendance — ${child.full}`}
        description="Daily marks as recorded by the form teacher. An empty range is this month. Raise anything that looks wrong with the school office."
      />
      <Rule />
      <AttendanceFilters {...filters} onChange={onChange} />
    </>
  )

  // Nothing to ask for, and `enabled` has left the query pending for ever
  // rather than answering. An account with no child linked reaches every page
  // under My children, and each of them has to say so.
  if (!child.id) {
    return (
      <div className="mx-auto w-full max-w-[980px]">
        {header}
        <EmptyState
          title="No child is linked to your account"
          body="Ask the school office to link your children to this account, and their register will appear here."
        />
      </div>
    )
  }

  // A request react-query has paused because it believes the browser is
  // offline never resolves and never errors, so it would shimmer for ever.
  const paused = fetchStatus === 'paused'
  if (error || (paused && !data)) {
    return (
      <div className="mx-auto w-full max-w-[980px]">
        {header}
        <EmptyState
          title="This register could not load"
          body={error ? errorMessage(error, OFFLINE_MESSAGE) : OFFLINE_MESSAGE}
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-[980px]">
        {header}
        <TableSkeleton rows={6} />
      </div>
    )
  }

  const rows = data.attendance.map(markRow)
  // The dates the endpoint actually used, which are not always the ones asked
  // for — an empty range is this month, and it says which month that was.
  const covered = rangeLabel(data.range?.from ?? '', data.range?.to ?? '')

  return (
    <div className="mx-auto w-full max-w-[980px]">
      {header}
      <TileStrip tiles={attendanceTiles(data.stats)} className="mb-3" />
      {covered && (
        <p className="mb-5.5 text-xs text-muted-foreground">
          Marks {covered}.
        </p>
      )}
      {rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-divider bg-raised shadow-card">
          <DataTable columns={COLUMNS} rows={rows} rowKey={rowKey} />
        </div>
      ) : (
        <EmptyState
          title="Nothing marked in these dates"
          body="The form teacher takes the register each day it is held. Widen the dates to see earlier marks."
        />
      )}
    </div>
  )
}
