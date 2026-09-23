import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs'
import { useCallback } from 'react'
import { attendanceKeys } from '@/api/attendance/keys'
import { attendanceService } from '@/api/attendance/service'
import { useExportAttendanceCsv } from '@/api/attendance/hooks'
import { DataTable } from '@/components/data-table/data-table'
import { Pagination } from '@/components/data-table/pagination'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { TileStrip } from '@/components/page/tile-strip'
import { Button } from '@/components/ui/button'
import { toTableColumns } from '@/features/collections/components/collection-columns'
import type { Row } from '@/features/collections/types'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import {
  coveringLabel,
  exportFilename,
  recordRow,
  reportParams,
  reportTiles,
} from './attendance'
import { type FilterValues, ReportFilters } from './report-filters'

const COLUMNS = toTableColumns([
  { key: 'when', label: 'Date', cardRole: 'subtitle' },
  { key: 'pupil', label: 'Pupil', cardRole: 'title' },
  { key: 'adm', label: 'Adm. no.' },
  { key: 'klass', label: 'Class' },
  { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
  { key: 'marked', label: 'Marked by' },
  { key: 'notes', label: 'Notes' },
])

const rowKey = (row: Row) => row.id

/**
 * Every mark taken over a range, and the breakdown across them.
 *
 * Both figures and rows come from the one endpoint, so nothing on the page can
 * disagree with anything else — and the CSV is the same endpoint's own file,
 * asked for with the same filters, so what is downloaded is what is on screen.
 */
export function AttendanceReportPage() {
  const [filters, setFilters] = useQueryStates({
    start: parseAsString.withDefault(''),
    end: parseAsString.withDefault(''),
    klass: parseAsString.withDefault(''),
    arm: parseAsString.withDefault(''),
    status: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  })

  const params = reportParams(filters)
  const { data, isPending, error, fetchStatus, refetch } = useQuery({
    queryKey: attendanceKeys.report({ ...params, page: filters.page, limit: PAGE_SIZE }),
    queryFn: () => attendanceService.report({ ...params, page: filters.page, limit: PAGE_SIZE }),
  })

  const download = useExportAttendanceCsv(exportFilename(data))

  // Anything that changes what is being looked at goes back to page one — the
  // fourth page of last month's marks is not a page of this month's.
  const onChange = useCallback(
    (next: Partial<FilterValues>) => void setFilters({ ...next, page: null }),
    [setFilters],
  )

  const header = (
    <>
      <PageHeader
        kicker="Students"
        title="Attendance report"
        description="Every mark taken over a range, pupil by pupil. An empty range is this month — the days the figures cover are named above them."
        action={
          <Button
            pending={download.isPending}
            onClick={() => void download.mutate(params)}
          >
            <Download className="size-[15px]" strokeWidth={2} />
            Export CSV
          </Button>
        }
      />
      <Rule />
      <ReportFilters {...filters} onChange={onChange} />
    </>
  )

  // A request react-query has paused because it believes the browser is
  // offline never resolves and never errors, so it would shimmer for ever.
  const paused = fetchStatus === 'paused'
  if (error || (paused && !data)) {
    return (
      <div className="max-w-[1040px]">
        {header}
        <EmptyState
          title="This report could not load"
          body={error ? errorMessage(error, OFFLINE_MESSAGE) : OFFLINE_MESSAGE}
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="max-w-[1040px]">
        {header}
        <TableSkeleton rows={PAGE_SIZE} />
      </div>
    )
  }

  const rows = data.records.map(recordRow)
  const { page, pages, total } = data.pagination
  const start = (page - 1) * PAGE_SIZE

  return (
    <div className="max-w-[1040px]">
      {header}

      <div className="mb-2 text-[12.5px] text-muted-foreground">
        Covering {coveringLabel(data)}
      </div>
      <TileStrip className="mb-2.5" tiles={reportTiles(data)} />
      {/* The endpoint counts all four whatever status is asked for, which is
          what makes them a breakdown rather than four copies of the total.
          Saying so is cheaper than a reader deciding the page is broken. */}
      <div className="mb-[26px] text-[12.5px] text-muted-foreground">
        {filters.status
          ? `Every status is counted above; the marks below are the ${filters.status} ones.`
          : 'Counted over the whole range, whatever the table below is narrowed to.'}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No marks in this range"
          body="Either no register was taken on these days, or nothing here matches the class and status you asked for."
        />
      ) : (
        <>
          <DataTable columns={COLUMNS} rows={rows} rowKey={rowKey} compact />
          <Pagination
            page={page}
            paged={{
              rows,
              total,
              from: total ? start + 1 : 0,
              to: start + rows.length,
              isFirstPage: page <= 1,
              isLastPage: page >= pages,
            }}
            footer="Attendance register"
            onPageChange={(next) => void setFilters({ page: next })}
          />
        </>
      )}
    </div>
  )
}
