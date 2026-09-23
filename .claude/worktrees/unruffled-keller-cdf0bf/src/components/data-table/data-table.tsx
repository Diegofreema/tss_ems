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
  onEdit,
  onDelete,
  canDelete,
  action,
  compact,
  searchQuery,
  onClearSearch,
}: {
  columns: Column<TRow>[]
  rows: TRow[]
  rowKey: (row: TRow) => string
  onRowClick?: (row: TRow) => void
  onEdit?: (row: TRow) => void
  onDelete?: (row: TRow) => void
  canDelete?: (row: TRow) => boolean
  /** A button on every row, beside the link into the record. */
  action?: RowAction<TRow>
  compact?: boolean
  searchQuery?: string
  onClearSearch?: () => void
}) {
  const phone = useBreakpoint('phone')

  return (
    <div className="overflow-x-auto border-2 border-divider">
      {phone ? (
        <CardView
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          onRowClick={onRowClick}
          onEdit={onEdit}
          onDelete={onDelete}
          canDelete={canDelete}
          action={action}
        />
      ) : (
        <TableView
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          onRowClick={onRowClick}
          action={action}
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
