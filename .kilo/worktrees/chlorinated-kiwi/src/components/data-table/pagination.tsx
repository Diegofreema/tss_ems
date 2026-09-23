import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Paged } from '@/hooks/use-list-query'
import { cn } from '@/lib/utils'
import { pageWindow } from './page-window'

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
  /*
   * The count is the one the list itself worked out, never re-derived here.
   * It used to be `total / (to - from + 1)` — the rows on screen taken for the
   * page size — which is only right on a full page: the last page of twelve
   * rows holds four, and four into twelve is three pages, so page 2 of 2 drew
   * a button for a page 3 that does not exist. Every register in the app is
   * paged by this one component, so that was every register.
   */
  const last = Math.max(1, paged.pages)

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">
        Showing {paged.from} to {paged.to} of {paged.total}{' '}
        {paged.total === 1 ? 'entry' : 'entries'}
        {footer && <span className="ml-1.5">· {footer}</span>}
      </div>

      <div className="flex items-center gap-1.5">
        <Step
          label="Previous page"
          disabled={paged.isFirstPage}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4.5" strokeWidth={2} />
        </Step>

        {pageWindow(page, last).map((entry, index) =>
          entry === 'gap' ? (
            <span
              key={`gap-${index}`}
              className="px-1 text-sm text-muted-foreground"
              aria-hidden="true"
            >
              ·····
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
              aria-current={entry === page ? 'page' : undefined}
              className={cn(
                'size-9 cursor-pointer rounded-full text-sm tabular-nums transition-colors',
                entry === page
                  ? 'bg-brand font-medium text-white'
                  : 'text-muted-foreground hover:bg-ui-line hover:text-foreground',
              )}
            >
              {entry}
            </button>
          ),
        )}

        <Step
          label="Next page"
          disabled={paged.isLastPage}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4.5" strokeWidth={2} />
        </Step>
      </div>
    </div>
  )
}

function Step({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-ui-line hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}
