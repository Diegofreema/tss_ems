import { Rule } from '@/components/page/rule'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { Shimmer } from './shimmer'
import { TableSkeleton } from './table-skeleton'

export function ListSkeleton({ label }: { label: string }) {
  return (
    <div>
      <Shimmer className="h-3 w-30" />
      <Shimmer className="mt-3.5 h-[34px] w-80" />
      <Rule />

      <TableSkeleton rows={PAGE_SIZE} />

      <div className="mt-3.5 text-xs text-muted-foreground">Loading {label}…</div>
    </div>
  )
}
