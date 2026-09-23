import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import type { ClassTimetable, Period } from '../../api/timetables/types.ts'
import { BLANK } from '../collections/blank.ts'
import { SCHOOL_WEEK, WEEK, weekPeriods } from './week.ts'

/**
 * A class timetable as a calendar rather than a list — one column per school
 * day, the periods stacked inside it in the order they are taught.
 *
 * A period carries a day of the week and two wall-clock times, and no date at
 * all: a timetable repeats every week until the office changes it. The dates
 * on the columns are therefore *this* week's, worked out from the reader's own
 * clock, and are a label rather than data — which is why the day name is the
 * heading and the date sits under it.
 *
 * The clock is passed in rather than read here, so the grid a test builds is
 * the same grid every time it runs it.
 */

export type PeriodBlock = {
  id: string
  /** "08:56 – 10:56", or whichever half of it the school entered. */
  time: string
  subject: string
  /** "2 hr", "40 min". Empty where the two times cannot be subtracted. */
  length: string
  /** Who takes it, where the reader's portal can say. Blank where it cannot. */
  teacher: string
  /**
   * The reader's own period, where the reader is a teacher. Undefined on a
   * portal the question does not apply to, which is not the same as false.
   */
  mine?: boolean
}

/**
 * What only the reader's portal knows about a period. A period carries a
 * subject id and no teacher at all, so who takes it — and whether that is the
 * person reading — is answered by a second endpoint the portal already holds.
 */
export type PeriodNote = { teacher?: string; mine?: boolean }

export type WeekColumn = {
  /** "Monday" — the school's own word, as it sent it. */
  day: string
  /** "1 Sep", this week. Empty for a day name the week does not have. */
  date: string
  /** Drawn out, so a reader finds today's column without reading dates. */
  today: boolean
  periods: PeriodBlock[]
}

/** "08:56" as minutes past midnight, and null for anything else. */
function clockMinutes(clock: string | null | undefined): number | null {
  const parts = /^(\d{1,2}):([0-5]\d)/.exec((clock ?? '').trim())
  if (!parts) return null
  const hours = Number(parts[1])
  return hours > 23 ? null : hours * 60 + Number(parts[2])
}

/**
 * "08:00 – 08:40". Both times are the school's wall clock, sent without a zone
 * and without seconds, so they are printed as they arrive.
 */
export function timeRange(period: Period): string {
  const from = period.start_time?.trim()
  const to = period.end_time?.trim()
  if (from && to) return `${from} – ${to}`
  return from || to || BLANK
}

/** The subject, or the school's own title where a period has no subject. */
export function labelOf(period: Period): string {
  return (
    period.label?.trim() || period.subject_name?.trim() || period.title?.trim() || BLANK
  )
}

/** How long a period runs, in the words a timetable uses for it. */
export function lengthOf(period: Period): string {
  const from = clockMinutes(period.start_time)
  const to = clockMinutes(period.end_time)
  if (from === null || to === null || to <= from) return ''
  const span = to - from
  const hours = Math.floor(span / 60)
  const minutes = span % 60
  return [hours && `${hours} hr`, minutes && `${minutes} min`].filter(Boolean).join(' ')
}

/** The date this week's Monday-based week gives a day name. */
function dateOf(day: string, today: Date): Date | null {
  const at = WEEK.indexOf(day.trim())
  if (at === -1) return null
  return addDays(startOfWeek(today, { weekStartsOn: 1 }), at)
}

/**
 * The columns to draw: the days the school sent, in its order, plus any day a
 * period claims that the payload forgot to open a column for. A period that
 * fell through would be a lesson its class never sees.
 */
function columnDays(timetable: ClassTimetable, claimed: Iterable<string>): string[] {
  const sent = (timetable.days ?? []).map((day) => day.day?.trim()).filter(Boolean) as string[]
  return [...new Set([...(sent.length ? sent : SCHOOL_WEEK), ...claimed])].filter(Boolean)
}

function blockOf(period: Period, note: PeriodNote): PeriodBlock {
  return {
    id: String(period.id),
    time: timeRange(period),
    subject: labelOf(period),
    length: lengthOf(period),
    teacher: note.teacher?.trim() || BLANK,
    mine: note.mine,
  }
}

export function weekGrid(
  timetable: ClassTimetable,
  today: Date,
  /** What the portal knows about a period that the timetable endpoint does not. */
  note: (period: Period) => PeriodNote = () => ({}),
): WeekColumn[] {
  const byDay = new Map<string, Period[]>()
  for (const period of weekPeriods(timetable)) {
    const day = period.day_of_week?.trim() ?? ''
    byDay.set(day, [...(byDay.get(day) ?? []), period])
  }

  return columnDays(timetable, byDay.keys()).map((day) => {
    const date = dateOf(day, today)
    return {
      day,
      date: date ? format(date, 'd MMM') : '',
      today: Boolean(date && isSameDay(date, today)),
      periods: (byDay.get(day) ?? []).map((period) => blockOf(period, note(period))),
    }
  })
}

/** How many periods the week holds, for the line under the grid. */
export function periodTally(columns: WeekColumn[]): number {
  return columns.reduce((total, column) => total + column.periods.length, 0)
}

/** How many of them are the reader's own. */
export function mineTally(columns: WeekColumn[]): number {
  return columns.reduce(
    (total, column) => total + column.periods.filter((period) => period.mine).length,
    0,
  )
}
