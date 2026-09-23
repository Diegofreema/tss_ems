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
import type { Row } from '@/features/collections/types'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import type { Child } from '../../family'
import { ResultsFilters } from './results-filters'
import { resultParams, resultRow, resultTiles } from './results'

const COLUMNS = toTableColumns([
  { key: 'subject', label: 'Subject', cardRole: 'title' },
  { key: 'ca', label: 'CA', align: 'right' },
  { key: 'exam', label: 'Exam', align: 'right' },
  { key: 'total', label: 'Total', align: 'right', cardRole: 'subtitle' },
  { key: 'grade', label: 'Grade', tag: true, cardRole: 'tag' },
  { key: 'remark', label: 'Remark' },
])

const rowKey = (row: Row) => row.id

/**
 * One child's approved results, for a session and a term.
 *
 * Its own page rather than one of the generic registers because the three
 * figures over it are the API's own and move with the filters — a register's
 * summary tiles are written into its definition and cannot.
 */
export function ResultsPage({ child }: { child: Child }) {
  const [filters, setFilters] = useQueryStates({
    session: parseAsString.withDefault(''),
    term: parseAsString.withDefault(''),
  })

  const params = resultParams(filters)
  const { data, isPending, error, fetchStatus, refetch } = useQuery({
    queryKey: myFamilyKeys.childResults(child.id, params),
    queryFn: () => myFamilyService.childResults(child.id, params),
    enabled: child.id > 0,
  })

  const onChange = useCallback(
    (next: { session?: string; term?: string }) => void setFilters(next),
    [setFilters],
  )

  const header = (
    <>
      <PageHeader
        kicker="My children"
        title={`Results — ${child.full}`}
        description="Approved results only. A subject appears here once the school has approved the batch it was marked in."
      />
      <Rule />
      <ResultsFilters {...filters} onChange={onChange} />
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
          body="Ask the school office to link your children to this account, and their results will appear here."
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
          title="These results could not load"
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

  const rows = data.results.map(resultRow)

  return (
    <div className="mx-auto w-full max-w-[980px]">
      {header}
      <TileStrip tiles={resultTiles(data.summary)} className="mb-6.5" />
      {rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-divider bg-raised shadow-card">
          <DataTable columns={COLUMNS} rows={rows} rowKey={rowKey} />
        </div>
      ) : (
        <EmptyState
          title="No results for this term"
          body="Nothing has been approved for the session and term you picked. Try another, or ask the school when the batch will be released."
        />
      )}
    </div>
  )
}
