import type { ChildTimetable } from '../../../../api/timetables/types.ts'
import {
  periodTally,
  weekGrid,
  type WeekColumn,
} from '../../../../features/timetable/week-grid.ts'

/**
 * The household's week — one calendar per child, off `GET /timetables/children`.
 *
 * A guardian has no timetable of their own and their children are usually in
 * different classes, so the page draws a week per child rather than one grid.
 * The endpoint answers the whole household in a single call, naming each
 * child, their class and their arm beside the class grid, so nothing here has
 * to be asked for class by class.
 *
 * Nothing is marked as anyone's: every period in a child's class is that
 * child's, and no endpoint a guardian may read says which subjects a child is
 * registered for.
 */

export type ChildWeek = {
  /** The child's id — the only thing that reliably tells two entries apart. */
  id: string
  /** The child's name, made unambiguous where the household repeats one. */
  name: string
  /** The same child on the tab above, as short as the household allows. */
  tab: string
  /** "JSS 1 · B", or whichever half the school entered. */
  klass: string
  columns: WeekColumn[]
  total: number
  /** Why there is nothing to draw — the school's own sentence where it sent one. */
  message: string | null
}

/** The class and the arm, in that order, with neither said twice. */
export function classLine(entry: ChildTimetable): string {
  const parts = [entry.class_name, entry.class_arm]
    .map((part) => part?.trim())
    .filter(Boolean) as string[]
  return [...new Set(parts)].join(' · ') || 'No class yet'
}

function nameOf(entry: ChildTimetable): string {
  return entry.name?.trim() || `Pupil ${entry.student_id}`
}

/**
 * Names for the headings, made unique.
 *
 * Households really do repeat a name: one guardian on bronze has two children
 * both called "Diego Freeman", both in JSS 1 arm B, and a third of the same
 * name in JSS III. Neither the name nor the class tells those two apart, so a
 * heading that would repeat carries the pupil id and one that would not stays
 * as the school wrote it.
 */
function headings(children: ChildTimetable[]): Map<number, string> {
  const seen = new Map<string, number>()
  const key = (entry: ChildTimetable) => `${nameOf(entry)}|${classLine(entry)}`
  for (const entry of children) seen.set(key(entry), (seen.get(key(entry)) ?? 0) + 1)

  return new Map(
    children.map((entry) => {
      const id = entry.student_id ?? 0
      const name = nameOf(entry)
      return [id, (seen.get(key(entry)) ?? 0) > 1 ? `${name} · pupil ${id}` : name]
    }),
  )
}

/**
 * How a child is named on their tab: the shortest form that still tells the
 * household apart, and the same form for every tab so the row reads evenly.
 *
 * The escalation is the household's to force. On a household of Ada and Chidi
 * the tabs say "Ada" and "Chidi"; on the bronze household of three children
 * called "Diego Freeman", two of them in the same arm, nothing shorter than
 * the pupil id separates them and the tabs say so.
 */
export function tabLabels(children: ChildTimetable[]): Map<number, string> {
  const first = (entry: ChildTimetable) => nameOf(entry).split(/\s+/)[0]
  const steps = [
    first,
    nameOf,
    (entry: ChildTimetable) => `${nameOf(entry)} \u00b7 ${classLine(entry)}`,
    (entry: ChildTimetable) => `${nameOf(entry)} \u00b7 pupil ${entry.student_id}`,
  ]

  const label =
    steps.find((step) => new Set(children.map(step)).size === children.length) ??
    steps[steps.length - 1]

  return new Map(children.map((entry) => [entry.student_id ?? 0, label(entry)]))
}

export function childWeeks(children: ChildTimetable[], today: Date): ChildWeek[] {
  const names = headings(children)
  const tabs = tabLabels(children)

  return children.map((entry): ChildWeek => {
    const grid = entry.timetable
    const columns = grid ? weekGrid(grid, today) : []
    return {
      id: String(entry.student_id ?? ''),
      name: names.get(entry.student_id ?? 0) ?? nameOf(entry),
      tab: tabs.get(entry.student_id ?? 0) ?? nameOf(entry),
      klass: classLine(entry),
      columns,
      total: periodTally(columns),
      // Only the reason this app can state itself. The API's own sentence for
      // an empty week explains the school's session settings, which a parent
      // can do nothing about — the page says "no timetable yet" instead.
      message: grid ? null : 'The school has not placed this child in a class yet.',
    }
  })
}
