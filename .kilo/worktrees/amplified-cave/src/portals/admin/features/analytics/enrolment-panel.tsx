import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useBusinessIntelligence } from '@/api/analytics/hooks'
import { BarChart, type Bar } from '@/components/charts/bar-chart'
import { RateBars, type Rate } from '@/components/charts/rate-bars'
import { DataTable } from '@/components/data-table/data-table'
import { TileStrip, type Tile } from '@/components/page/tile-strip'
import { toTableColumns } from '@/features/collections/components/collection-columns'
import { optionsQuery } from '@/features/collections/option-feeds'
import type { Row } from '@/features/collections/types'
import { classBars, enrolmentTiles, genderRates, sharedPeak, stateRows } from './analytics'
import { Caption, Panel } from './panel'

const STATES = toTableColumns([
  { key: 'state', label: 'State of origin', cardRole: 'title' },
  { key: 'students', label: 'Students', align: 'right' },
])

const rowKey = (row: Row) => row.id

/**
 * Who is enrolled, off `business-intelligence`.
 *
 * Deliberately outside the two tabs: it answers for the whole school and
 * takes no parameters, so it is the one block on this page that a session or
 * a subject cannot change. Putting it under the filter bar would say
 * otherwise.
 */
export function EnrolmentPanel() {
  const intelligence = useBusinessIntelligence()

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

  return (
    <Panel pending={intelligence.isPending} error={intelligence.error}>
      <TileStrip tiles={tiles} size="lg" />

      <div className="mt-8 grid gap-8 @3xl/page:grid-cols-[1.35fr_1fr]">
        <section>
          <h4 className="mb-0.5 text-xl">Students per class</h4>
          <p className="text-xs text-muted-foreground">
            Admitted students, largest class first.
          </p>
          {classes.length > 0 ? (
            <BarChart bars={classes} peak={sharedPeak(classes)} />
          ) : (
            <Caption>No student has been admitted into a class yet.</Caption>
          )}
        </section>

        <section>
          <h4 className="mb-0.5 text-xl">Gender split</h4>
          <p className="text-xs text-muted-foreground">Share of everyone admitted.</p>
          {genders.length > 0 ? (
            <RateBars rates={genders} weakBelow={0} />
          ) : (
            <Caption>No gender has been recorded against an admitted student.</Caption>
          )}
        </section>
      </div>

      <h4 className="mb-3.5 mt-8 text-xl">Where students come from</h4>
      <DataTable columns={STATES} rows={states} rowKey={rowKey} compact />
      <Caption>
        Local governments are counted on the tile above but not named — this API
        publishes no LGA catalogue to name them from.
      </Caption>
    </Panel>
  )
}
