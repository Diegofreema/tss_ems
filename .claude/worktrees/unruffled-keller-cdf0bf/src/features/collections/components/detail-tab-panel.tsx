import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Suspense, useState } from 'react'
import { SectionHeading } from '@/components/common/section-heading'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/common/segmented-control'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { TableView } from '@/components/data-table/table-view'
import type { DetailTab, Row } from '../types'
import { toTableColumns } from './collection-columns'

/** How many rows the tab shimmers while it loads. */
const SKELETON_ROWS = 3

function TabTable({ tab, rows }: { tab: DetailTab; rows: Row[] }) {
  // `TableView` draws a header and nothing else for an empty list, which reads
  // as a table that has not loaded rather than one with nothing in it.
  if (rows.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        {tab.empty ?? 'Nothing to show'}
      </div>
    )
  }

  return (
    <TableView
      columns={toTableColumns(tab.columns)}
      rows={rows}
      rowKey={(row) => row.id}
    />
  )
}

/** A tab the API answers for. Suspends, so the frame shimmers rather than
 *  flashing "nothing to show" on the way in. */
function LiveTab({
  tab,
  recordId,
  source,
}: {
  tab: DetailTab
  recordId: string
  source: NonNullable<DetailTab['source']>
}) {
  const { data } = useSuspenseQuery({
    queryKey: ['detail-tab', tab.label, recordId],
    queryFn: () => source(recordId),
  })
  return <TabTable tab={tab} rows={data} />
}

/**
 * The record's sub-tables. More than one becomes the design's segmented
 * control; a single tab is just a titled table.
 */
export function DetailTabPanel({
  tabs,
  recordId,
}: {
  tabs: DetailTab[]
  recordId: string
}) {
  const [active, setActive] = useState(0)
  const tab = tabs[active]

  // A collection with nothing to show beside the record shows nothing, rather
  // than an empty frame under a heading for a table that does not exist.
  if (!tab) return null

  const action = tab.action?.(recordId)

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
        {action && (
          <Button asChild variant="outline" size="sm" className="mb-3.5">
            <Link to={action.to} search={action.search}>
              {action.label}
            </Link>
          </Button>
        )}
      </div>

      <div key={active} className="animate-ems-up overflow-x-auto">
        <Suspense fallback={<TableSkeleton rows={SKELETON_ROWS} />}>
          <div className="border-2 border-divider">
            {tab.source ? (
              <LiveTab tab={tab} recordId={recordId} source={tab.source} />
            ) : (
              <TabTable tab={tab} rows={tab.rows ?? []} />
            )}
          </div>
        </Suspense>
      </div>
    </section>
  )
}
