import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import type { Align, CardRole } from '@/lib/table'

export type { CardRole }

/**
 * What a row can be made to do. `label` reads the row, so an action that
 * toggles a state names the one the row is not in — and returning nothing
 * leaves that row without an action at all.
 *
 * Drawn as an item in the row's menu on a table and as a button on a phone's
 * card, which is why nothing here says how it looks.
 */
export type RowAction<TRow> = {
  label: (row: TRow) => string | undefined
  onSelect: (row: TRow) => void
  /**
   * This row's action is in flight. Read per row rather than for the table, so
   * one row spinning does not disable the rest of the register.
   */
  pending?: (row: TRow) => boolean
  /**
   * Drawn in the danger colour — suspending a student, withdrawing a result.
   * Read per row, because the two directions of a state that toggles are not
   * both destructive: the one that gives the place back is not.
   */
  danger?: (row: TRow) => boolean
  /** The glyph beside it in the menu. A tick, or a bar where it is danger. */
  icon?: LucideIcon
}

export type Column<TRow> = {
  key: string
  label: string
  align?: Align
  cell: (row: TRow) => ReactNode
  cardRole?: CardRole
  /** Keeps the cell on one line — used for dates and amounts. */
  nowrap?: boolean
}
