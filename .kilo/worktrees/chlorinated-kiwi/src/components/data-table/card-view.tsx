import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Column, RowAction } from './types'

/**
 * Under 640px every list becomes cards: the title column as a heading, the
 * subtitle muted beneath it, the status tag pinned top-right, and everything
 * else as label/value pairs.
 */
export function CardView<TRow>({
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
}: {
  columns: Column<TRow>[]
  rows: TRow[]
  rowKey: (row: TRow) => string
  onRowClick?: (row: TRow) => void
  /** Which rows have a record to open. Every one of them without it. */
  canOpen?: (row: TRow) => boolean
  onEdit?: (row: TRow) => void
  onDelete?: (row: TRow) => void
  /** Which rows may actually be edited. Every one of them without it. */
  canEdit?: (row: TRow) => boolean
  /** Which rows may actually be deleted. Every one of them without it. */
  canDelete?: (row: TRow) => boolean
  action?: RowAction<TRow>
}) {
  const byRole = (role: Column<TRow>['cardRole']) =>
    columns.find((column) => column.cardRole === role)

  const title = byRole('title') ?? columns[0]
  const subtitle = byRole('subtitle')
  const tag = byRole('tag')
  const fields = columns.filter(
    (column) =>
      column !== title &&
      column !== subtitle &&
      column !== tag &&
      column.cardRole !== 'hidden',
  )

  const hasActions = Boolean(onEdit || onDelete || action)

  return (
    <>
      {rows.map((row, index) => {
        // A card with nothing behind it takes no tap — a record created on
        // this device has no page at the school until the queue sends it.
        const open =
          onRowClick && (canOpen?.(row) ?? true) ? () => onRowClick(row) : undefined

        return (
          <div
            key={rowKey(row)}
            onClick={open}
            style={{ animationDelay: `${index * 34}ms` }}
            className={cn(
              'animate-ems-row border-b border-divider p-3.5 transition-colors',
              open && 'cursor-pointer hover:bg-neutral-100',
            )}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-pretty">
                  {title.cell(row) as ReactNode}
                </div>
                {subtitle && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {subtitle.cell(row)}
                  </div>
                )}
              </div>
              {tag && <div className="flex-none">{tag.cell(row)}</div>}
            </div>

            {fields.length > 0 && (
              <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-x-3.5 gap-y-2.5">
                {fields.map((field) => (
                  <div key={field.key}>
                    <div className="text-2xs uppercase tracking-label text-muted-foreground">
                      {field.label}
                    </div>
                    <div className="mt-0.5 text-sm tabular-nums">
                      {field.cell(row)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasActions && (
              <div
                className="mt-3.5 flex gap-2"
                onClick={(event) => event.stopPropagation()}
              >
                {onEdit && (canEdit?.(row) ?? true) && (
                  <Button variant="outline" onClick={() => onEdit(row)}>
                    Edit
                  </Button>
                )}
                {onDelete && (canDelete?.(row) ?? true) && (
                  <Button variant="destructive" onClick={() => onDelete(row)}>
                    Delete
                  </Button>
                )}
                {action?.label(row) && (
                  <Button
                    variant="outline"
                    pending={action.pending?.(row)}
                    onClick={() => action.onSelect(row)}
                  >
                    {action.label(row)}
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
