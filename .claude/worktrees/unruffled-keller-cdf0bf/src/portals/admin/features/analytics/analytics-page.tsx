import { useQuery } from '@tanstack/react-query'
import { parseAsString, useQueryStates } from 'nuqs'
import { useCallback, useMemo, type ReactNode } from 'react'
import {
  useBusinessIntelligence,
  useFinancialAnalytics,
  usePayments,
  useResultAnalytics,
} from '@/api/analytics/hooks'
import { BarChart, type Bar } from '@/components/charts/bar-chart'
import { RateBars, type Rate } from '@/components/charts/rate-bars'
import { SectionHeading } from '@/components/common/section-heading'
import { DataTable } from '@/components/data-table/data-table'
import { Shimmer } from '@/components/feedback/shimmer'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { TileStrip, type Tile } from '@/components/page/tile-strip'
import { toTableColumns } from '@/features/collections/components/collection-columns'
import { optionsQuery } from '@/features/collections/option-feeds'
import type { Row } from '@/features/collections/types'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { formatCount, formatNaira } from '@/lib/format'
import { AnalyticsFilters } from './analytics-filters'
import { SettlePayment } from './settle-payment'
import {
  classBars,
  enrolmentTiles,
  genderRates,
  paymentRow,
  paymentRows,
  paymentsTotal,
  seriesBars,
  seriesTotal,
  sharedPeak,
  stateRows,
} from './analytics'

/** How many settled transactions the reconciliation list holds. */
const PAYMENT_SCAN = 100

const STATES = toTableColumns([
  { key: 'state', label: 'State of origin', cardRole: 'title' },
  { key: 'pupils', label: 'Pupils', align: 'right' },
])

const PAYMENTS = toTableColumns([
  { key: 'paid', label: 'When', cardRole: 'subtitle' },
  { key: 'payer', label: 'Paid by', cardRole: 'title' },
  { key: 'fee', label: 'For' },
  { key: 'reference', label: 'Reference' },
  { key: 'amount', label: 'Amount', align: 'right' },
])

const rowKey = (row: Row) => row.id

/**
 * A section that can fail on its own.
 *
 * Four endpoints answer this page and any one of them can be down while the
 * rest are fine, so a failure is reported where it happened rather than
 * replacing the page — an office that cannot read the grade comparison can
 * still read what was collected.
 */
function Panel({
  pending,
  error,
  empty,
  children,
}: {
  pending: boolean
  error: unknown
  /** Shown when the endpoint answered and had nothing to say. */
  empty?: string
  children: ReactNode
}) {
  if (error) {
    return (
      <p className="border-2 border-brand px-4 py-3.5 text-[13px] text-muted-foreground">
        {errorMessage(error, OFFLINE_MESSAGE)}
      </p>
    )
  }
  if (pending) return <Shimmer className="h-[190px] w-full" />
  if (empty) {
    return <p className="py-6 text-[13px] text-muted-foreground">{empty}</p>
  }
  return <>{children}</>
}

/** A chart's caption — what the whole series came to, in one line. */
function Caption({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[12.5px] text-muted-foreground">{children}</p>
}

/**
 * The office's analytics: who is enrolled, what they scored and what was
 * paid, off the four `/admins` reads that answer for the school as a whole.
 *
 * Every figure here is the API's own. Nothing is added up from a register
 * this page pulled itself, which is deliberate — the dashboard already does
 * that for money, and two pages totalling the same ledger different ways is
 * how a school ends up with two answers to one question.
 */
export function AdminAnalyticsPage() {
  const [filters, setFilters] = useQueryStates({
    session: parseAsString.withDefault(''),
    subject: parseAsString.withDefault(''),
  })

  const sessions = useQuery(optionsQuery('sessions', ''))
  const subjects = useQuery(optionsQuery('subjects', ''))

  // Neither endpoint has a default of its own, so the page picks one: the
  // newest session, which is the order the feed already sends them in, and
  // the first subject on the register. Both are only until something is
  // chosen, and what was chosen lives in the URL so the view can be shared.
  const session = filters.session || sessions.data?.[0]?.value || ''
  const subject = filters.subject || subjects.data?.[0]?.value || ''
  const sessionId = Number(session) || undefined
  const subjectId = Number(subject) || undefined

  const onChange = useCallback(
    (next: { session: string; subject: string }) => void setFilters(next),
    [setFilters],
  )

  const intelligence = useBusinessIntelligence()
  const financial = useFinancialAnalytics(sessionId)
  const results = useResultAnalytics({ subject_id: subjectId, session_id: sessionId })
  const payments = usePayments({ session_id: sessionId, limit: PAYMENT_SCAN })

  // The class and state feeds are the same ones the forms use, so naming the
  // buckets costs a request only when nothing has needed them for five
  // minutes. Nigeria's are the only states this API's numbering is known for.
  const classFeed = useQuery(optionsQuery('classes', ''))
  const stateFeed = useQuery(optionsQuery('states', 'NG'))
  const classNames = useMemo(
    () => new Map((classFeed.data ?? []).map((option) => [option.value, option.label])),
    [classFeed.data],
  )
  const stateNames = useMemo(
    () => new Map((stateFeed.data ?? []).map((option) => [option.value, option.label])),
    [stateFeed.data],
  )

  const tiles: Tile[] = enrolmentTiles(intelligence.data)
  const classes: Bar[] = classBars(intelligence.data, classNames)
  const genders: Rate[] = genderRates(intelligence.data)
  const states: Row[] = stateRows(intelligence.data, stateNames)

  const money = {
    current: seriesBars(financial.data?.current, true) as Bar[],
    previous: seriesBars(financial.data?.previous, true) as Bar[],
  }
  const moneyPeak = sharedPeak(money.current, money.previous)

  const grades = {
    current: seriesBars(results.data?.current, false) as Bar[],
    previous: seriesBars(results.data?.previous, false) as Bar[],
  }
  const gradePeak = sharedPeak(grades.current, grades.previous)

  const settled = paymentRows(payments.data)
  const sessionName = sessions.data?.find((option) => option.value === session)?.label

  return (
    <div>
      <PageHeader
        kicker="Finance"
        title="Analytics"
        description="Enrolment, grades and money collected, each compared against the session before it. Every figure on this page is the API's own."
      />
      <Rule />

      <AnalyticsFilters
        session={session}
        subject={subject}
        sessions={sessions.data ?? []}
        subjects={subjects.data ?? []}
        onChange={onChange}
      />

      <SectionHeading className="mb-4">Enrolment</SectionHeading>
      <Panel pending={intelligence.isPending} error={intelligence.error}>
        <TileStrip tiles={tiles} size="lg" />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          <section>
            <h4 className="mb-0.5 text-xl">Pupils per class</h4>
            <p className="text-[12.5px] text-muted-foreground">
              Admitted pupils, largest class first.
            </p>
            {classes.length > 0 ? (
              <BarChart bars={classes} peak={sharedPeak(classes)} />
            ) : (
              <Caption>No pupil has been admitted into a class yet.</Caption>
            )}
          </section>

          <section>
            <h4 className="mb-0.5 text-xl">Gender split</h4>
            <p className="text-[12.5px] text-muted-foreground">
              Share of everyone admitted.
            </p>
            {genders.length > 0 ? (
              <RateBars rates={genders} weakBelow={0} />
            ) : (
              <Caption>No gender has been recorded against an admitted pupil.</Caption>
            )}
          </section>
        </div>

        <h4 className="mb-3.5 mt-8 text-xl">Where pupils come from</h4>
        <DataTable columns={STATES} rows={states} rowKey={rowKey} compact />
        <Caption>
          Local governments are counted on the tile above but not named — this
          API publishes no LGA catalogue to name them from.
        </Caption>
      </Panel>

      <Rule className="mt-8" />
      <SectionHeading className="mb-4">
        Money collected{sessionName ? ` · ${sessionName}` : ''}
      </SectionHeading>
      <Panel
        pending={financial.isPending || sessions.isPending}
        error={financial.error}
        empty={
          money.current.length === 0 && money.previous.length === 0
            ? 'Nothing has been paid against this session or the one before it.'
            : undefined
        }
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h4 className="mb-0.5 text-xl">This session</h4>
            <BarChart bars={money.current} peak={moneyPeak} />
            <Caption>{formatNaira(seriesTotal(financial.data?.current))} collected</Caption>
          </section>
          <section>
            <h4 className="mb-0.5 text-xl">The session before</h4>
            <BarChart bars={money.previous} peak={moneyPeak} />
            <Caption>{formatNaira(seriesTotal(financial.data?.previous))} collected</Caption>
          </section>
        </div>
      </Panel>

      <Rule className="mt-8" />
      <SectionHeading className="mb-4">
        Grades{results.data?.subject?.name ? ` · ${results.data.subject.name}` : ''}
      </SectionHeading>
      <Panel
        pending={results.isPending || subjects.isPending}
        error={results.error}
        empty={
          grades.current.length === 0 && grades.previous.length === 0
            ? 'No result has been filed for this subject in either session.'
            : undefined
        }
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h4 className="mb-0.5 text-xl">This session</h4>
            <BarChart bars={grades.current} peak={gradePeak} />
            <Caption>{formatCount(seriesTotal(results.data?.current))} results filed</Caption>
          </section>
          <section>
            <h4 className="mb-0.5 text-xl">The session before</h4>
            <BarChart bars={grades.previous} peak={gradePeak} />
            <Caption>{formatCount(seriesTotal(results.data?.previous))} results filed</Caption>
          </section>
        </div>
      </Panel>

      <Rule className="mt-8" />
      <SectionHeading className="mb-4">Settled transactions</SectionHeading>
      <Panel pending={payments.isPending} error={payments.error}>
        <TileStrip
          className="mb-[26px]"
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
          {formatCount(PAYMENT_SCAN)} are listed.
        </Caption>
      </Panel>

      <Rule className="mt-8" />
      <SectionHeading className="mb-4">Chase up a payment</SectionHeading>
      <SettlePayment />
    </div>
  )
}
