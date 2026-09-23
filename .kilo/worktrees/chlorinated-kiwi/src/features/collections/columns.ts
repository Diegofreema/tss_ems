import { BLANK } from './blank.ts'
import type { ColumnSpec, Row } from './types.ts'

/**
 * The columns worth drawing for the rows actually on screen.
 *
 * A column no row on this page has a value for is left out, rather than drawn
 * as a header over a stack of dashes. A register's specs list what a row *can*
 * hold, and these endpoints fill very little of it — a class the answer never
 * names, a batch whose teacher is not expanded — so a column of dashes reads
 * as data that has gone missing rather than as a field this school does not
 * use.
 *
 * Two things are deliberately kept. An empty register keeps every column,
 * because with no rows at all every one of them looks empty and the header is
 * the only thing left explaining the table. And the card layout's title stays
 * whatever happens: it is the heading of each card on a phone, and a card with
 * no heading is a stack of values belonging to nobody.
 *
 * It is per page, so a column blank across this page and filled on the next
 * will appear when you get there. That is the honest behaviour — the
 * alternative is asking the whole register before drawing any of it.
 */
export function filledColumns(specs: ColumnSpec[], rows: Row[]): ColumnSpec[] {
  if (rows.length === 0) return specs
  return specs.filter(
    (spec) =>
      spec.cardRole === 'title' ||
      rows.some((row) => {
        /*
         * `String(...)` rather than trusting the type. `Row` says every cell
         * is a string and a row builder that hands over a number is a bug —
         * but the bug lands *here*, as `value.trim is not a function` thrown
         * out of a `.some()` during render, which takes the whole register to
         * its error boundary and reports it as "We could not reach the school
         * system" about an answer the school gave in full.
         *
         * That is what the library page did on 2026-09-16, when `isavailable`
         * changed from a word to a number under it. One field's shape must not
         * be able to delete a page: a wrong-looking cell is a bug somebody can
         * see and fix, and a dead register is a bug that hides its own cause.
         */
        const value = row[spec.key]
        if (value === undefined || value === null) return false
        const written = String(value).trim()
        return written !== '' && written !== BLANK
      }),
  )
}
