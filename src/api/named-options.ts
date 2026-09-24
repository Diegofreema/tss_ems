// Relative and with the extension, so this module can be imported by
// `node --test` — see the note on tests in CLAUDE.md.
import type { Option } from '../features/collections/options.ts'

/**
 * `{id, name}` rows as dropdown options, in the order a person reads them.
 *
 * The shape every public list the application form reads comes in — classes,
 * countries, states, LGAs. The endpoint's own order is its row order ("JSS 3"
 * arrives first because it was created last), and a keyed list does not keep
 * it anyway, so the list states its own: by name, with numbers read as
 * numbers. A row with no name is left out rather than offered as a blank line
 * nobody could choose on purpose.
 */
export function namedOptions(rows: readonly { id: number; name?: string | null }[]): Option[] {
  return rows
    .filter((row) => row.name?.trim())
    .map((row) => ({ value: String(row.id), label: row.name!.trim() }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { numeric: true }))
}
