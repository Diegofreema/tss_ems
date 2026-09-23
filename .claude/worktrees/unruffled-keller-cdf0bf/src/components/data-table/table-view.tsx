import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Column, RowAction } from './types'

/** The desktop table. Rows are clickable; a trailing chevron cell hints at that. */
export function TableView<TRow>({
  columns,
  rows,
  rowKey,
  onRowClick,
  action,
  compact,
}: {
  columns: Column<TRow>[]
  rows: TRow[]
  rowKey: (row: TRow) => string
  onRowClick?: (row: TRow) => void
  action?: RowAction<TRow>
  compact?: boolean
}) {
  // The design sets the record's name semibold. Column sets that declare a
  // card title say which one that is; the rest follow the second-column rule.
  const titleIndex = columns.findIndex((column) => column.cardRole === 'title')
  const boldIndex = titleIndex === -1 ? 1 : titleIndex

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              className={cn(
                'border-b-2 border-divider p-2 text-2xs font-normal uppercase tracking-[0.08em] whitespace-nowrap text-muted-foreground',
                column.align === 'right' ? 'text-right' : 'text-left',
              )}
            >
              {column.label}
            </th>
          ))}
          {action && <th className="border-b-2 border-divider" />}
          {onRowClick && <th className="w-11 border-b-2 border-divider" />}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            style={{ animationDelay: `${rowIndex * 30}ms` }}
            className={cn(
              'animate-ems-row hover:bg-foreground/4',
              onRowClick && 'cursor-pointer',
            )}
          >
            {columns.map((column, columnIndex) => (
              <td
                key={column.key}
                className={cn(
                  'border-b border-divider tabular-nums',
                  compact ? 'px-2 py-1.25' : 'px-2 py-2.75',
                  column.align === 'right' ? 'text-right' : 'text-left',
                  column.nowrap && 'whitespace-nowrap',
                  columnIndex === boldIndex && 'font-semibold',
                )}
              >
                {column.cell(row)}
              </td>
            ))}
            {/* The row itself opens the record, so the cell holding the
                button stops the click getting that far. */}
            {action && (
              <td
                className={cn(
                  'border-b border-divider text-right',
                  compact ? 'px-2 py-1.25' : 'px-2 py-1.75',
                )}
                onClick={(event) => event.stopPropagation()}
              >
                <RowActionButton row={row} action={action} />
              </td>
            )}
            {onRowClick && (
              <td
                className={cn(
                  'border-b border-divider text-right text-neutral-500',
                  compact ? 'px-2 py-1.25' : 'px-2 py-2.75',
                )}
              >
                <ChevronRight
                  className="inline-block size-3.75"
                  strokeWidth={2}
                />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RowActionButton<TRow>({
  row,
  action,
}: {
  row: TRow
  action: RowAction<TRow>
}) {
  const label = action.label(row)
  if (!label) return null

  return (
    <Button
      variant="outline"
      size="sm"
      pending={action.pending?.(row)}
      onClick={() => action.onSelect(row)}
    >
      {label}
    </Button>
  )
}
