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
 * class the account may open, marks the periods that are theirs, and keeps
 * only the classes that hold at least one.
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
  /**
   * The class's week could not be read at all — the school refused it, or the
   * device could not reach it. **Not the same as a class with nothing of
   * theirs in it**, and the difference is why this field exists: a class with
   * no period of theirs is hidden, and one nobody could read is shown with
   * the reason, because hiding it would be this app claiming the teacher has
   * no period there on the strength of a question it never got an answer to.
   *
   * Told apart by `days`: the API sends the five school days on every grid,
   * present and empty where nothing is drawn, so a grid with no days at all
   * is the fallback `classTimetableQuery` substitutes for a failure.
   */
  unreadable: boolean
  /** Why it could not be read. Only ever set beside `unreadable`. */
  note?: string
}

/**
 * Why a teacher's week is empty, in the terms that explain it.
 *
 * The page can be empty while the school's timetable is not, and the reason is
 * always the same one: the periods drawn are in subjects that are not theirs.
 * Read off bronze on 2026-09-16 — teacher 135 takes Agriculture and Home
 * Economics, and the two periods on file school-wide are Igbo Language in
 * JSS 1 and Physical and Health Education in SSS 3 — where the old page showed
 * both of those and marked them "Not one of your subjects", which at least
 * said so. Hiding the classes is what was asked for, so the sentence has to
 * carry what the page no longer shows: name the subjects, and the mismatch is
 * the reader's to see rather than a blank page to puzzle over.
 */
export function noPeriodsYet(subjects: TeacherSubject[]): string {
  const names = subjects.map((subject) => subject.name?.trim()).filter(Boolean) as string[]
  if (names.length === 0)
    return 'The office has not put any subject in your hands yet, so no period can be yours. They appear on My subjects once it has.'
  return `Every class open to you was read, and none of the periods drawn in them is in ${sentenceList(
    names,
  )}. A class appears here as soon as the office draws a period for one of your subjects.`
}

/** "English", "English and Maths", "English, Maths and Igbo". */
function sentenceList(words: string[]): string {
  if (words.length < 2) return words[0] ?? ''
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
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
    const unreadable = (grid.days ?? []).length === 0
    return {
      id: String(klass.id),
      label: labels.get(klass.id) ?? klass.name,
      columns,
      total: periodTally(columns),
      mine: mineTally(columns),
      unreadable,
      note: unreadable ? (grid.message?.trim() || undefined) : undefined,
    }
  })

  /*
   * A class the teacher takes nothing in is not on this page at all (the
   * teacher's call, 2026-09-16 — it used to sort them below their own and
   * label them "none yours").
   *
   * The classes are still every one `GET /timetables/classes` hands back, and
   * every week is still fetched, because there is no other way to know which
   * of them holds a period of theirs — a subject's `department_id` names the
   * class it belongs to, but a class with a subject of theirs in it and no
   * period drawn for it yet is exactly a class with nothing to show. The
   * filter is on the periods actually in the grid, so it is the same fact the
   * page would otherwise be drawing.
   *
   * **A week nobody could read is kept**, below their own. Dropping it would
   * be the app answering a question it never heard back on, and this is the
   * one page in the portal where that is a live risk rather than a
   * hypothetical: no teaching login has ever been shown to be allowed
   * `/timetables/class/{id}`, and `classTimetableQuery` turns a refusal into
   * an empty grid on purpose so one closed class cannot take the other five
   * calendars down. An empty grid that means "refused" and an empty grid that
   * means "nothing drawn" are the same object; only `days` tells them apart.
   *
   * Their own order is the server's, which is the school's order of classes.
   */
  return weeks
    .filter((week) => week.mine > 0 || week.unreadable)
    .sort((a, b) => Number(a.unreadable) - Number(b.unreadable))
}

/**
 * The line under the page header: how much of the school's week is theirs.
 *
 * Counted over the classes that hold a period of theirs, so a week that could
 * not be read is not counted as a class they teach in. An empty list is the
 * page's own empty state, not a sentence under a header with nothing beneath
 * it.
 */
export function teachingSummary(weeks: ClassWeek[]): string {
  const mine = weeks.reduce((total, week) => total + week.mine, 0)
  const classes = weeks.filter((week) => week.mine > 0).length
  if (mine === 0) return 'None of the periods entered so far are in your subjects.'
  return `${mine} period${mine === 1 ? '' : 's'} a week, across ${classes} class${
    classes === 1 ? '' : 'es'
  }.`
}
