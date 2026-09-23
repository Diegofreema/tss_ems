import type { TeacherSubject } from '../../../../api/teachers/types.ts'
import type { ClassTimetable, Period } from '../../../../api/timetables/types.ts'
import {
  mineTally,
  periodTally,
  weekGrid,
  type WeekColumn,
} from '../../../../features/timetable/week-grid.ts'

/**
 * A teacher's classes, each drawn as its own week.
 *
 * A teacher is not given a timetable of their own — the school draws one per
 * class, and a teacher takes subjects in several. So the page reads every
 * class the account may open and marks the periods that are theirs.
 *
 * What makes a period theirs is its subject: `GET /teachers/me/subjects`
 * returns the subjects the office has assigned, and a subject belongs to
 * exactly one class (`department_id` on the subject itself), so a subject id
 * is already class-scoped and matching on it alone cannot claim another
 * class's lesson.
 */

/** One row of `GET /timetables/classes` — an id and a name, and nothing else. */
export type TimetableClass = { id: number; name: string }

export type ClassWeek = {
  id: string
  /** The class's name, made unambiguous where the school reuses one. */
  label: string
  columns: WeekColumn[]
  /** Periods in the class's week, and how many of them are the reader's. */
  total: number
  mine: number
}

/** The subject ids in this teacher's hands. */
export function mySubjectIds(subjects: TeacherSubject[]): Set<number> {
  return new Set(subjects.map((subject) => subject.id))
}

/**
 * Names for the picker, made unique.
 *
 * Two classes on bronze are both called "SSS I" (ids 2 and 6). A teacher
 * cannot tell those apart by name, and picking the wrong one is picking the
 * wrong roll, so a repeated name carries its id and a unique one does not.
 */
export function classLabels(classes: TimetableClass[]): Map<number, string> {
  const seen = new Map<string, number>()
  for (const klass of classes) {
    const name = klass.name?.trim() || `Class ${klass.id}`
    seen.set(name, (seen.get(name) ?? 0) + 1)
  }

  return new Map(
    classes.map((klass) => {
      const name = klass.name?.trim() || `Class ${klass.id}`
      return [klass.id, (seen.get(name) ?? 0) > 1 ? `${name} · class ${klass.id}` : name]
    }),
  )
}

/**
 * The classes a teacher has periods in come first, then the classes with a
 * timetable at all, then the ones the office has not drawn yet — a teacher
 * opens this page for their own week, not for the school's.
 */
function band(week: ClassWeek): number {
  if (week.mine > 0) return 0
  return week.total > 0 ? 1 : 2
}

export function classWeeks(
  entries: { klass: TimetableClass; grid: ClassTimetable }[],
  subjectIds: Set<number>,
  today: Date,
): ClassWeek[] {
  const labels = classLabels(entries.map((entry) => entry.klass))

  const note = (period: Period) => {
    const mine = period.subject_id != null && subjectIds.has(period.subject_id)
    // Nothing on this API names the teacher of someone else's period, and a
    // dash reads as missing data rather than as "not yours".
    return { mine, teacher: mine ? '' : 'Not one of your subjects' }
  }

  const weeks = entries.map(({ klass, grid }): ClassWeek => {
    const columns = weekGrid(grid, today, note)
    return {
      id: String(klass.id),
      label: labels.get(klass.id) ?? klass.name,
      columns,
      total: periodTally(columns),
      mine: mineTally(columns),
    }
  })

  // Stable, so classes inside a band keep the order the server sent them in.
  return [...weeks].sort((a, b) => band(a) - band(b))
}

/** The line under the page header: how much of the school's week is theirs. */
export function teachingSummary(weeks: ClassWeek[]): string {
  const mine = weeks.reduce((total, week) => total + week.mine, 0)
  const classes = weeks.filter((week) => week.mine > 0).length
  if (mine === 0) return 'None of the periods entered so far are in your subjects.'
  return `${mine} period${mine === 1 ? '' : 's'} a week, across ${classes} class${
    classes === 1 ? '' : 'es'
  }.`
}
