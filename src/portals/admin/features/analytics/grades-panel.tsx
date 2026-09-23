import { useResultAnalytics } from '@/api/analytics/hooks'
import { BarChart, type Bar } from '@/components/charts/bar-chart'
import { SectionHeading } from '@/components/common/section-heading'
import { formatCount } from '@/lib/format'
import { seriesBars, seriesTotal, sharedPeak } from './analytics'
import { Caption, Panel } from './panel'

/**
 * The grade comparison, off `result-analytics?subject_id&session_id`.
 *
 * Both ids are the endpoint's own requirement, which is why the tab shows
 * both selects: this tab is the only reason the subject filter exists.
 */
export function GradesPanel({
  sessionId,
  subjectId,
  filtersPending,
}: {
  sessionId: number | undefined
  subjectId: number | undefined
  /** The two feeds the selects are drawn from, still loading. */
  filtersPending: boolean
}) {
  const results = useResultAnalytics({ subject_id: subjectId, session_id: sessionId })

  const current = seriesBars(results.data?.current, false) as Bar[]
  const previous = seriesBars(results.data?.previous, false) as Bar[]
  const peak = sharedPeak(current, previous)

  return (
    <>
      <SectionHeading className="mb-4">
        Grades{results.data?.subject?.name ? ` · ${results.data.subject.name}` : ''}
      </SectionHeading>
      <Panel
        pending={results.isPending || filtersPending}
        error={results.error}
        empty={
          current.length === 0 && previous.length === 0
            ? 'No result has been filed for this subject in either session.'
            : undefined
        }
      >
        <div className="grid gap-8 @3xl/page:grid-cols-2">
          <section>
            <h4 className="mb-0.5 text-xl">This session</h4>
            <BarChart bars={current} peak={peak} />
            <Caption>{formatCount(seriesTotal(results.data?.current))} results filed</Caption>
          </section>
          <section>
            <h4 className="mb-0.5 text-xl">The session before</h4>
            <BarChart bars={previous} peak={peak} />
            <Caption>{formatCount(seriesTotal(results.data?.previous))} results filed</Caption>
          </section>
        </div>
      </Panel>
    </>
  )
}
