import { Ban, Check, Eye, MoreVertical } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { cn } from '@/lib/utils'
import type { RowAction } from './types'

/**
 * The three dots at the end of a row, and what is under them.
 *
 * A register's row used to carry its action as a button of its own, beside a
 * chevron that meant "open this". Two affordances, one of them a word that
 * changes per row — so a column of them read as a column of different buttons,
 * and the width they took came off the columns that hold the record. The menu
 * puts both in one place: the way into the record first, then whatever this
 * row can be made to do.
 *
 * A row whose action `label` returns nothing gets a menu with the opener alone,
 * and a row with neither is given no menu at all — see `TableView`, which
 * keeps the plain chevron for a register that only opens.
 */
export function RowMenu<TRow>({
  row,
  action,
  openLabel,
  onOpen,
}: {
  row: TRow
  action?: RowAction<TRow>
  /** What the first item says, e.g. "Open the student". */
  openLabel?: string
  onOpen?: () => void
}) {
  const label = action?.label(row)
  const pending = action?.pending?.(row) ?? false
  const danger = action?.danger?.(row) ?? false
  const Icon = action?.icon ?? (danger ? Ban : Check)
  const opens = Boolean(openLabel && onOpen)

  /*
   * Nothing to put in it. A register where every row opens always has the
   * first item, but a ledger has no record page behind its rows and its
   * action is withheld per row — an invoice settled before the counter kept
   * transactions has neither a payment to take nor a slip to show. Without
   * this that row carried three dots over an empty card.
   */
  if (!opens && !label) return null

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="More for this row"
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-ui-line hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-hidden data-[state=open]:bg-ui-line data-[state=open]:text-foreground"
      >
        <MoreVertical className="size-4.5" strokeWidth={2} />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          /* The row under the menu is a click target of its own, so a click
             that dismisses the menu must not also open that record. */
          onCloseAutoFocus={(event) => event.preventDefault()}
          className="z-50 min-w-52 animate-ems-pop rounded-xl bg-raised p-1.5 shadow-float ring-1 ring-foreground/10 outline-hidden"
        >
          {opens && onOpen && (
            <MenuItem icon={Eye} onSelect={onOpen}>
              {openLabel}
            </MenuItem>
          )}

          {action && label && (
            <MenuItem
              icon={Icon}
              danger={danger}
              disabled={pending}
              onSelect={() => action.onSelect(row)}
            >
              {label}
            </MenuItem>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function MenuItem({
  icon: Icon,
  danger,
  disabled,
  onSelect,
  children,
}: {
  icon: typeof Eye
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] outline-hidden select-none',
        'data-disabled:pointer-events-none data-disabled:opacity-55',
        danger
          ? 'text-danger-ink data-highlighted:bg-danger-subtle'
          : 'text-foreground data-highlighted:bg-ui-line',
      )}
    >
      <Icon className="size-4.5 flex-none" strokeWidth={1.9} aria-hidden="true" />
      <span className="truncate">{children}</span>
    </DropdownMenu.Item>
  )
}
