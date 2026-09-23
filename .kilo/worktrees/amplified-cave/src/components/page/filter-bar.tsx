import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'

/**
 * The row over a register: search on the left, whatever narrows it beside
 * that, and how many rows answered at the end.
 *
 * The page's own action is **not** here — it sits beside the title, where a
 * primary action is looked for. It was tried here, on the reasoning that the
 * eye is already on this row, and the reasoning did not survive the screen it
 * was drawn on: a register carries a search box and four filters, which on a
 * laptop is already more than one line's worth, so the one button somebody
 * came to press was the thing that wrapped onto a second row and ended up
 * under the filters rather than above them.
 */
export function FilterBar({
  query,
  onQueryChange,
  placeholder,
  count,
  children,
  searchable = true,
}: {
  query: string
  onQueryChange: (query: string) => void
  placeholder: string
  /** e.g. "11 students". */
  count: string
  /** Extra filter controls, rendered between the search box and the count. */
  children?: ReactNode
  /** False where the endpoint takes no search term, so the box is left out. */
  searchable?: boolean
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5">
      {searchable && (
        <div className="relative min-w-[220px] flex-1 @2xl/page:max-w-[360px]">
          <Search
            className="pointer-events-none absolute inset-y-0 left-4 my-auto size-4.5 text-ui-hint"
            strokeWidth={1.9}
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="pl-11"
          />
        </div>
      )}
      {children}
      {/* Pinned right rather than pushed there by a spacer, so it stays at the
          end of the row when the filters wrap onto a second line rather than
          landing under the search box. */}
      <div className="ml-auto text-sm tabular-nums text-muted-foreground">
        {count}
      </div>
    </div>
  )
}
