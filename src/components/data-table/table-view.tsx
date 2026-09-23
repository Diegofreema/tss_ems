import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RowMenu } from './row-menu'
import type { Column, RowAction } from './types'

/**
 * The desktop table: a filled header band, roomy rows and no rules between
 * them — the design separates rows by air, and a line under every one of forty
 * is a page of lines. The row still lifts on hover, which is what says it can
 * be opened.
 *
 * A row that can be acted on ends in a menu rather than a button and a
 * chevron. The button was a word that changed per row — Suspend beside
 * Restore beside nothing at all — so a column of them read as a column of
 * different buttons, and the width it took came off the columns holding the
 * record. One glyph holds both jobs now: the way into the record, then what
 * this row can be made to do. A register that only opens keeps its chevron,
 * because a menu of one item is a worse door than an arrow.
 */
export function TableView<TRow>({
  columns,
  rows,
  rowKey,
  onRowClick,
  canOpen,
  action,
  openLabel,
  compact,
}: {
  columns: Column<TRow>[]
  rows: TRow[]
  rowKey: (row: TRow) => string
  onRowClick?: (row: TRow) => void
  /** Which rows have a record to open. Every one of them without it. */
  canOpen?: (row: TRow) => boolean
  action?: RowAction<TRow>
  /** What the menu's first item says, e.g. "Open the student". */
  openLabel?: string
  compact?: boolean
}) {
  // The design sets the record's name semibold. Column sets that declare a
  // card title say which one that is; the rest follow the second-column rule.
  const titleIndex = columns.findIndex((column) => column.cardRole === 'title')
  const boldIndex = titleIndex === -1 ? 1 : titleIndex

  return (
    <table className="w-full border-separate border-spacing-0 text-[15px]">
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              className={cn(
                'bg-ui-line px-4 py-3.5 text-sm font-medium whitespace-nowrap text-foreground first:rounded-l-lg last:rounded-r-lg',
                column.align === 'right' ? 'text-right' : 'text-left',
              )}
            >
              {column.label}
            </th>
          ))}
          {(action || onRowClick) && (
            <th className="w-14 bg-ui-line px-4 py-3.5 text-right text-sm font-medium last:rounded-r-lg">
              <span className="sr-only">{action ? 'Actions' : 'Open'}</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => {
          /*
           * One decision, read three times: whether the row takes a click,
           * whether it draws a cursor and a chevron, and whether the menu
           * offers a way in. A register where a row can have no record behind
           * it yet — one enrolled on this device and still in the queue — must
           * answer no to all three, or the door is drawn over a record the
           * school has never heard of.
           */
          const open =
            onRowClick && (canOpen?.(row) ?? true) ? () => onRowClick(row) : undefined

          return (
            <tr
              key={rowKey(row)}
              onClick={open}
              style={{ animationDelay: `${rowIndex * 30}ms` }}
              className={cn(
                'animate-ems-row transition-colors hover:bg-ui-line/70',
                open && 'cursor-pointer',
              )}
            >
              {columns.map((column, columnIndex) => (
                <td
                  key={column.key}
                  className={cn(
                    'tabular-nums',
                    compact ? 'px-4 py-2' : 'px-4 py-4',
                    column.align === 'right' ? 'text-right' : 'text-left',
                    column.nowrap && 'whitespace-nowrap',
                    columnIndex === boldIndex && 'font-semibold',
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
              {/* The row itself opens the record, so the cell holding the menu
                  stops the click getting that far — opening a menu must not also
                  open the record behind it. */}
              {action ? (
                <td
                  className={cn(
                    'text-right',
                    compact ? 'px-4 py-1.5' : 'px-4 py-2.5',
                  )}
                  onClick={(event) => event.stopPropagation()}
                >
                  <RowMenu
                    row={row}
                    action={action}
                    openLabel={openLabel}
                    onOpen={open}
                  />
                </td>
              ) : (
                onRowClick && (
                  <td
                    className={cn(
                      'text-right text-neutral-500',
                      compact ? 'px-4 py-2' : 'px-4 py-4',
                    )}
                  >
                    {/* The cell is drawn either way, or the row that cannot be
                        opened would be a column short and the table would step
                        in on its last column. */}
                    {open && (
                      <ChevronRight
                        className="inline-block size-3.75"
                        strokeWidth={2}
                      />
                    )}
                  </td>
                )
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

