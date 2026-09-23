import type { ClassTimetable, Period } from '../../api/timetables/types.ts'

/**
 * The one thing every timetable page has to agree on: what order the week is
 * in. A grid arrives as `days`, a list of days each holding its periods, and
 * three portals read the same grid — the office looking at a class, a teacher
 * looking at the classes they take, a student looking at their own.
 */

/** Monday first, and the two the school does not teach on last. */
export const WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

/** The five the school actually teaches on, for a payload that sent no days. */
export const SCHOOL_WEEK = WEEK.slice(0, 5)

export function dayIndex(day: string | null | undefined): number {
  const at = WEEK.indexOf((day ?? '').trim())
  // A day the school invents sorts after the week rather than before it.
  return at === -1 ? WEEK.length : at
}

/**
 * Every period of a week, in the order it is taught.
 *
 * `days` arrives as a list rather than an object so its order is the school's;
 * that order is kept, and the periods inside a day are put in time order,
 * which the endpoint does not promise and does not always send — class 1 came
 * back with Monday's 11:58 period before its 08:56 one.
 */
export function weekPeriods(timetable: ClassTimetable): Period[] {
  return (timetable.days ?? [])
    .flatMap((day) => day.periods ?? [])
    .sort(
      (a, b) =>
        dayIndex(a.day_of_week) - dayIndex(b.day_of_week) ||
        (a.start_time ?? '').localeCompare(b.start_time ?? ''),
    )
}
