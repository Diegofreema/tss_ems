import { Panel } from '@/components/page/panel'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { Shimmer } from './shimmer'
import { TableSkeleton } from './table-skeleton'

/**
 * The register while it is still loading, in the card the register itself
 * sits in — so the page does not change shape when the rows land.
 */
export function ListSkeleton({ label }: { label: string }) {
  return (
    <Panel className="p-5 sm:p-6">
      <Shimmer className="h-3 w-30" />
      <Shimmer className="mt-3 h-[30px] w-80" />
      <Shimmer className="mt-3 h-3 w-100" />

      <div className="mt-6">
        <TableSkeleton rows={PAGE_SIZE} />
      </div>

      <div className="mt-4 text-sm text-muted-foreground">Loading {label}…</div>
    </Panel>
  )
}
