import { useFinancialAnalytics, usePayments } from '@/api/analytics/hooks'
import { BarChart, type Bar } from '@/components/charts/bar-chart'
import { SectionHeading } from '@/components/common/section-heading'
import { DataTable } from '@/components/data-table/data-table'
import { Rule } from '@/components/page/rule'
import { TileStrip } from '@/components/page/tile-strip'
import { toTableColumns } from '@/features/collections/components/collection-columns'
import type { Row } from '@/features/collections/types'
import { formatCount, formatNaira } from '@/lib/format'
import { paymentRow, paymentRows, paymentsTotal, seriesBars, seriesTotal, sharedPeak } from './analytics'
import { Caption, Panel } from './panel'
import { SettlePayment } from './settle-payment'

const PAYMENTS = toTableColumns([
  { key: 'paid', label: 'When', cardRole: 'subtitle' },
  { key: 'payer', label: 'Paid by', cardRole: 'title' },
  { key: 'fee', label: 'For' },
  { key: 'reference', label: 'Reference' },
  { key: 'amount', label: 'Amount', align: 'right' },
])

const rowKey = (row: Row) => row.id

/**
 * What the school collected, off the two money reads —
 * `financial-analytics?session_id` and `payments?session_id&limit`.
 *
 * They share a tab because they are the same question twice: the charts are
 * the totals the API adds up, the table is the transactions behind them. The
 * settle tool is here rather than on its own because a reference that needs
 * chasing is one that failed to appear in the table above it.
 */
export function MoneyPanel({
  sessionId,
  sessionName,
  limit,
  filtersPending,
}: {
  sessionId: number | undefined
  /** Named in the heading, so the charts say which session they are for. */
  sessionName: string | undefined
  limit: number
  /** The session feed the select is drawn from, still loading. */
  filtersPending: boolean
}) {
  const financial = useFinancialAnalytics(sessionId)
  const payments = usePayments({ session_id: sessionId, limit })

  const current = seriesBars(financial.data?.current, true) as Bar[]
  const previous = seriesBars(financial.data?.previous, true) as Bar[]
  const peak = sharedPeak(current, previous)
  const settled = paymentRows(payments.data)

  const currentTotal = seriesTotal(financial.data?.current)
  const previousTotal = seriesTotal(financial.data?.previous)
  const level = currentTotal === previousTotal

  return (
    <>
      <SectionHeading className="mb-4">
        Money collected{sessionName ? ` · ${sessionName}` : ''}
      </SectionHeading>
      <Panel
        pending={financial.isPending || filtersPending}
        error={financial.error}
        empty={
          current.length === 0 && previous.length === 0
            ? 'Nothing has been paid against this session or the one before it.'
            : undefined
        }
      >
        {/* The one honest directional delta on this page: both totals are the
            API's own, so the arrow compares two real figures. */}
        <TileStrip
          className="mb-6"
          tiles={[
            {
              label: 'Collected this session',
              value: formatNaira(currentTotal),
              delta: level
                ? 'Level with the session before'
                : `${formatNaira(Math.abs(currentTotal - previousTotal))} ${
                    currentTotal > previousTotal ? 'more' : 'less'
                  } than the session before`,
              deltaTone: level ? 'muted' : currentTotal > previousTotal ? 'up' : 'down',
            },
            { label: 'The session before', value: formatNaira(previousTotal) },
          ]}
        />

        <div className="grid gap-8 @3xl/page:grid-cols-2">
          <section>
            <h4 className="mb-0.5 text-xl">This session</h4>
            <BarChart bars={current} peak={peak} />
            <Caption>{formatNaira(currentTotal)} collected</Caption>
          </section>
          <section>
            <h4 className="mb-0.5 text-xl">The session before</h4>
            <BarChart bars={previous} peak={peak} />
            <Caption>{formatNaira(previousTotal)} collected</Caption>
          </section>
        </div>
      </Panel>

      <Rule className="mt-8" />
      <SectionHeading className="mb-4">Settled transactions</SectionHeading>
      <Panel pending={payments.isPending} error={payments.error}>
        <TileStrip
          className="mb-6.5"
          tiles={[
            { label: 'Payments settled', value: formatCount(settled.length) },
            { label: 'Worth', value: formatNaira(paymentsTotal(settled)) },
          ]}
        />
        <DataTable
          columns={PAYMENTS}
          rows={settled.map(paymentRow)}
          rowKey={rowKey}
          compact
        />
        <Caption>
          Settled transactions only — nothing pending appears here. The newest{' '}
          {formatCount(limit)} are listed.
        </Caption>
      </Panel>

      <Rule className="mt-8" />
      <SectionHeading className="mb-4">Chase up a payment</SectionHeading>
      <SettlePayment />
    </>
  )
}
