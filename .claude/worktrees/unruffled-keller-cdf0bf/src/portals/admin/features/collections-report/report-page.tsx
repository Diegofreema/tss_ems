import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { parseAsString, useQueryStates } from 'nuqs'
import { useCallback } from 'react'
import { BackLink } from '@/components/page/back-link'
import { SectionHeading } from '@/components/common/section-heading'
import { DataTable } from '@/components/data-table/data-table'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { TileStrip } from '@/components/page/tile-strip'
import { Button } from '@/components/ui/button'
import { paymentMethods } from '@/api/collect-fees/hooks'
import { collectFeeKeys } from '@/api/collect-fees/keys'
import { collectFeesService } from '@/api/collect-fees/service'
import { toTableColumns } from '@/features/collections/components/collection-columns'
import type { Row } from '@/features/collections/types'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { methodLabel } from '@/features/collections/payment-methods'
import { reportPaymentRow } from '@/portals/admin/collections/collect-row'
import { ReportFilters } from './report-filters'
import { methodRows, rangeLabel, reportParams, reportTiles } from './report'

const BY_METHOD = toTableColumns([
  { key: 'method', label: 'Method' },
  { key: 'entries', label: 'Payments', align: 'right' },
  { key: 'discount', label: 'Discounted', align: 'right' },
  { key: 'amount', label: 'Collected', align: 'right' },
])

// No reference column: it runs to nearly forty characters, and pushing the
// receipt button off the right of the table hides the one thing this list is
// for. The slip itself carries the reference, which is where it is quoted from.
const PAYMENTS = toTableColumns([
  { key: 'taken', label: 'When', cardRole: 'subtitle' },
  { key: 'student', label: 'Pupil', cardRole: 'title' },
  { key: 'fee', label: 'Fee' },
  { key: 'method', label: 'Method' },
  { key: 'discount', label: 'Discount', align: 'right' },
  { key: 'amount', label: 'Collected', align: 'right' },
])

const rowKey = (row: Row) => row.id

/**
 * What the counter took, over a range. Every figure on it is the API's own —
 * the totals, the per-method split and the payments behind them all come from
 * one endpoint, so nothing here can disagree with anything else.
 */
export function CollectionsReportPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useQueryStates({
    start: parseAsString.withDefault(''),
    end: parseAsString.withDefault(''),
    method: parseAsString.withDefault(''),
  })

  const params = reportParams(filters)
  const { data, isPending, error, fetchStatus, refetch } = useQuery({
    queryKey: collectFeeKeys.report(params),
    queryFn: async () => ({
      report: await collectFeesService.report(params),
      methods: await paymentMethods().catch(() => undefined),
    }),
  })

  const onChange = useCallback(
    (next: { start?: string; end?: string; method?: string }) =>
      void setFilters(next),
    [setFilters],
  )

  const header = (
    <>
      <BackLink to="/admin/collect" label="Back to fee collection" />
      <PageHeader
        kicker="Finance · Fee collection"
        title="Collections report"
        description="Money taken at the counter, by method. An empty range is this month — the dates the figures cover are named above them."
      />
      <Rule />
      <ReportFilters {...filters} onChange={onChange} />
    </>
  )

  // A request react-query has paused because it believes the browser is
  // offline never resolves and never errors, so it would shimmer for ever.
  // Same treatment as a list that cannot load: say so, offer another go.
  const paused = fetchStatus === 'paused'
  if (error || (paused && !data)) {
    return (
      <div className="max-w-[980px]">
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
      <div className="max-w-[980px]">
        {header}
        <TableSkeleton rows={6} />
      </div>
    )
  }

  const { report, methods } = data
  const payments = report.payments.map((payment) => reportPaymentRow(payment, methods))
  const byMethod = methodRows(report, methods)

  return (
    <div className="max-w-[980px]">
      {header}

      <div className="mb-2 text-[12.5px] text-muted-foreground">
        Covering {rangeLabel(report)}
        {/* The API echoes the key back; the school's own word for it is
            what the page has been saying everywhere else. */}
        {report.range?.payment_method
          ? ` · ${methodLabel(report.range.payment_method, methods)}`
          : ''}
      </div>
      <TileStrip className="mb-[30px]" tiles={reportTiles(report.totals)} />

      <SectionHeading className="mb-4">By method</SectionHeading>
      <DataTable
        columns={BY_METHOD}
        rows={byMethod}
        rowKey={rowKey}
        compact
      />

      <SectionHeading className="mb-4 mt-[30px]">
        Payments in this range
      </SectionHeading>
      <DataTable
        columns={PAYMENTS}
        rows={payments}
        rowKey={rowKey}
        // Where a bursar reconciling the day finds the slip to reprint.
        action={{
          label: (row) => (row.invoiceId ? 'Receipt' : undefined),
          onSelect: (row) =>
            void navigate({
              to: '/admin/collect/receipt/$invoiceId',
              params: { invoiceId: row.invoiceId },
            }),
        }}
        compact
      />

      <div className="mt-2.5 text-[12.5px] text-muted-foreground">
        {payments.length === 0
          ? 'Nothing was collected in this range.'
          : `${payments.length} ${payments.length === 1 ? 'payment' : 'payments'}, newest first`}
      </div>
    </div>
  )
}
