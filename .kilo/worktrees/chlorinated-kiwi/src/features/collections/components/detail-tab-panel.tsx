import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Component, Suspense, useState, type ReactNode } from 'react'
import { SectionHeading } from '@/components/common/section-heading'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/common/segmented-control'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { CardView } from '@/components/data-table/card-view'
import { TableView } from '@/components/data-table/table-view'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import type { CollectionRoutes, DetailTab, Row } from '../types'
import { DetailAccordion } from './detail-accordion'
import { toTableColumns } from './collection-columns'

/** How many rows the tab shimmers while it loads. */
const SKELETON_ROWS = 3

function TabTable({
  tab,
  rows,
  recordId,
  routes,
}: {
  tab: DetailTab
  rows: Row[]
  recordId: string
  routes: CollectionRoutes
}) {
  const navigate = useNavigate()
  const phone = useBreakpoint('phone')
  const { rowTo, rowRecord } = tab

  // Rows whose substance is prose are read in panels that open, not in cells.
  if (tab.accordion)
    return (
      <DetailAccordion
        rows={rows}
        spec={tab.accordion}
        tab={tab}
        recordId={recordId}
        routes={routes}
      />
    )

  // `TableView` draws a header and nothing else for an empty list, which reads
  // as a table that has not loaded rather than one with nothing in it.
  if (rows.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        {tab.empty ?? 'Nothing to show'}
      </div>
    )
  }

  const columns = toTableColumns(tab.columns ?? [])
  const onRowClick = rowTo
    ? (row: Row) => {
        const { to, search } = rowTo(recordId, row)
        void navigate({ to, search })
      }
    : rowRecord
      ? (row: Row) =>
          void navigate({ to: routes.record, params: rowRecord(recordId, row) })
      : undefined

  /*
   * Cards on a phone, exactly as every register does — `DataTable` has made
   * this choice since the design landed, and a record's own sub-tables were
   * the one place still drawing the desktop table at any width.
   *
   * It was not merely cramped, it was *lossy*: the frame around the table
   * clips to its own rounded corners, so an assignment's Questions tab put
   * 498px of columns in a 343px box and Points and Answer could not be
   * reached at all — not by scrolling, not by turning the phone. A teacher
   * checking what a question was worth on the way to a lesson simply could
   * not see it.
   */
  if (phone)
    return (
      <CardView
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={onRowClick}
      />
    )

  return (
    <TableView
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      onRowClick={onRowClick}
    />
  )
}

/** A tab the API answers for. Suspends, so the frame shimmers rather than
 *  flashing "nothing to show" on the way in. */
function LiveTab({
  tab,
  recordId,
  source,
  routes,
}: {
  tab: DetailTab
  recordId: string
  source: NonNullable<DetailTab['source']>
  routes: CollectionRoutes
}) {
  const { data } = useSuspenseQuery({
    queryKey: ['detail-tab', tab.label, recordId],
    queryFn: () => source(recordId),
    // `always`, so an offline device fails fast into the boundary below —
    // under the default `online` the request pauses without running and the
    // tab sits on its skeleton for as long as the device is offline.
    networkMode: 'always',
  })
  return <TabTable tab={tab} rows={data} recordId={recordId} routes={routes} />
}

/**
 * Catches a tab whose source could not be reached, so one dead endpoint costs
 * that tab and not the record beside it — without this the throw walks up to
 * the route's boundary and replaces the whole page. Retrying remounts the
 * tab, which asks again.
 */
class TabBoundary extends Component<
  { retry: () => void; children: ReactNode },
  { error: unknown | null }
> {
  state: { error: unknown | null } = { error: null }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  render() {
    if (this.state.error !== null) {
      return (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {errorMessage(this.state.error, OFFLINE_MESSAGE)}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3.5"
            onClick={() => {
              this.setState({ error: null })
              this.props.retry()
            }}
          >
            Try again
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * The record's sub-tables. More than one becomes the design's segmented
 * control; a single tab is just a titled table.
 */
export function DetailTabPanel({
  tabs,
  recordId,
  routes,
}: {
  tabs: DetailTab[]
  recordId: string
  /**
   * Where this portal mounts its record and create pages — a tab's row leads
   * to one and its `add` button to the other. A read-only portal publishes no
   * create route, which is also where a tab offering to add something would
   * be a button with nowhere to go.
   */
  routes: CollectionRoutes
}) {
  const [active, setActive] = useState(0)
  // Bumped by the boundary's "Try again": a new key remounts the tab, and a
  // fresh mount of its suspense query asks the school again.
  const [attempt, setAttempt] = useState(0)
  const tab = tabs[active]

  // A collection with nothing to show beside the record shows nothing, rather
  // than an empty frame under a heading for a table that does not exist.
  if (!tab) return null

  const action = tab.action?.(recordId)
  const createPath = routes.create
  const add = createPath ? tab.add?.(recordId) : undefined

  return (
    // `min-w-0`: a grid item sizes to its content by default, so a wide tab
    // — a payment history is six columns — would push the record beside it
    // off the page instead of scrolling inside its own frame.
    <section className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {tabs.length > 1 ? (
          <SegmentedControl
            name="detail-tab"
            className="mb-4.5"
            value={String(active)}
            onChange={(value) => setActive(Number(value))}
            options={tabs.map((entry, index) => ({
              value: String(index),
              label: entry.label,
            }))}
          />
        ) : (
          <SectionHeading className="mb-3.5">{tab.label}</SectionHeading>
        )}
        {(action || add) && (
        <div className="mb-3.5 flex flex-wrap gap-2.5">
          {action && (
            <Button asChild variant="outline" size="sm">
              <Link to={action.to} search={action.search}>
                {action.label}
              </Link>
            </Button>
          )}
          {/* The record in front of the reader is what the new row belongs to,
              so it travels to the form as a value rather than being chosen
              again — the one thing about it that is already decided. */}
          {add && createPath && (
            <Button asChild size="sm">
              <Link
                to={createPath}
                params={{ collection: add.collection }}
                search={add.values}
              >
                {add.label}
              </Link>
            </Button>
          )}
        </div>
        )}
      </div>

      <div key={`${active}:${attempt}`} className="animate-ems-up">
        <TabBoundary retry={() => setAttempt((count) => count + 1)}>
          <Suspense fallback={<TableSkeleton rows={SKELETON_ROWS} />}>
            {/* The scroll is on the frame itself, not on a wrapper around it.
                `overflow-hidden` here is what rounds the corners, and it was
                also what cut a wide table off: the wrapper outside could not
                scroll to columns its own child had already clipped. */}
            <div className="overflow-x-auto rounded-xl border border-divider bg-raised shadow-card">
              {tab.source ? (
                <LiveTab
                  tab={tab}
                  recordId={recordId}
                  source={tab.source}
                  routes={routes}
                />
              ) : (
                <TabTable
                  tab={tab}
                  rows={tab.rows ?? []}
                  recordId={recordId}
                  routes={routes}
                />
              )}
            </div>
          </Suspense>
        </TabBoundary>
      </div>
    </section>
  )
}
