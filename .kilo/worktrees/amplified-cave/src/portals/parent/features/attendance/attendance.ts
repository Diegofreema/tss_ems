import type {
  AttendanceStats,
  ChildAttendanceParams,
  ChildMark,
} from '../../../../api/parents/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { when } from '../../../../features/collections/when.ts'
import { capitalise, formatCount } from '../../../../lib/format.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/**
 * What the register is asked for. A blank bound is left off rather than sent
 * empty — the endpoint defaults an empty range to the current month, and that
 * default is better than anything this page could invent.
 */
export function attendanceParams(input: {
  start?: string | null
  end?: string | null
}): ChildAttendanceParams {
  return {
    ...(input.start ? { start_date: input.start } : {}),
    ...(input.end ? { end_date: input.end } : {}),
  }
}

/** One day's mark, as the form teacher recorded it. */
export function markRow(record: ChildMark): Row {
  const at = new Date(record.attendance_date)
  const dated = !Number.isNaN(at.getTime())

  return {
    id: String(record.id),
    date: when(record.attendance_date),
    day: dated ? at.toLocaleDateString('en-NG', { weekday: 'long' }) : BLANK,
    state: capitalise(text(record.status)),
    note: text(record.notes),
  }
}

/**
 * The figures over the register.
 *
 * The rate is the API's own and counts a late mark as attended; recomputing it
 * here from the four counts would be a second opinion on a number the school
 * already has one of. A range nobody marked has no rate rather than nought
 * per cent — a school that took no register is not a child who missed a day.
 */
export function attendanceTiles(stats: AttendanceStats | undefined) {
  const total = stats?.total ?? 0
  return [
    { label: 'Days marked', value: formatCount(total) },
    { label: 'Present', value: formatCount(stats?.present ?? 0) },
    { label: 'Absent', value: formatCount(stats?.absent ?? 0) },
    { label: 'Attendance', value: total ? `${Math.round(stats?.rate ?? 0)}%` : BLANK },
  ]
}
