import { Button } from '@/components/ui/button'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { CardView } from './card-view'
import { TableView } from './table-view'
import type { Column, RowAction } from './types'

/**
 * Chooses the table or the card layout for the viewport, and owns the
 * "nothing matches your search" state that sits inside the same 2px frame.
 */
export function DataTable<TRow>({
  columns,
  rows,
  rowKey,
  onRowClick,
  canOpen,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  action,
  openLabel,
  compact,
  searchQuery,
  onClearSearch,
}: {
  columns: Column<TRow>[]
  rows: TRow[]
  rowKey: (row: TRow) => string
  onRowClick?: (row: TRow) => void
  /**
   * Which rows have a record to open. Every one of them without it.
   *
   * Separate from `canEdit`, and not the same question: a row can be perfectly
   * readable and still not editable — an office record this account may not
   * touch. This one is about whether there is anything at the other end at
   * all, which for a record still in the outbox there is not.
   */
  canOpen?: (row: TRow) => boolean
  onEdit?: (row: TRow) => void
  onDelete?: (row: TRow) => void
  /** Which rows may actually be edited. Every one of them without it. */
  canEdit?: (row: TRow) => boolean
  canDelete?: (row: TRow) => boolean
  /** What a row can be made to do. Drawn in the row's menu; see `RowMenu`. */
  action?: RowAction<TRow>
  /** What that menu's first item says, e.g. "Open the student". */
  openLabel?: string
  compact?: boolean
  searchQuery?: string
  onClearSearch?: () => void
}) {
  const phone = useBreakpoint('phone')

  return (
    <div className="overflow-x-auto">
      {phone ? (
        <CardView
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          onRowClick={onRowClick}
          canOpen={canOpen}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          canDelete={canDelete}
          action={action}
        />
      ) : (
        <TableView
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          onRowClick={onRowClick}
          canOpen={canOpen}
          action={action}
          openLabel={openLabel}
          compact={compact}
        />
      )}

      {rows.length === 0 && (
        <div className="px-6 py-14 text-center">
          <div className="font-heading text-lg font-extrabold">
            {searchQuery ? `Nothing matches “${searchQuery}”` : 'Nothing to show'}
          </div>
          {searchQuery && (
            <>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Clear the search to see the full register.
              </p>
              <Button variant="outline" className="mt-2" onClick={onClearSearch}>
                Clear search
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
