import { Button } from '@/components/ui/button'
import type { Paged } from '@/hooks/use-list-query'

export function Pagination<T>({
  page,
  paged,
  footer,
  onPageChange,
}: {
  page: number
  paged: Paged<T>
  /** Left-hand note, e.g. "Showing 6 of 6 fees · First Term 2025/2026". */
  footer?: string
  onPageChange: (page: number) => void
}) {
  return (
    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs text-muted-foreground">{footer}</div>
      <div className="flex items-center gap-2">
        <span className="mr-1.5 text-xs tabular-nums text-muted-foreground">
          Showing {paged.from}–{paged.to} of {paged.total}
        </span>
        <Button
          variant="outline"
          disabled={paged.isFirstPage}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={paged.isLastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
