import type {
  AttendanceClassArm,
  AttendanceClassCount,
  AttendanceDashboard,
  AttendanceDepartment,
  AttendanceExportParams,
  AttendanceRecord,
  AttendanceReport,
} from '../../../../api/attendance/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import { fromApiDate, rangeLabel } from '../../../../features/collections/date-range.ts'
import { distinct } from '../../../../features/collections/options.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { formatCount, formatDate } from '../../../../lib/format.ts'

/** The sentinel a select uses for "no filter" — Radix has no empty option. */
export const ANY = 'all'

/** The four words a mark can carry, as the school reads them. */
export const STATUSES = ['present', 'absent', 'late', 'excused'] as const

function titleCase(value: string | null | undefined): string {
  const word = value?.trim()
  return word ? word[0].toUpperCase() + word.slice(1) : BLANK
}

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** A YYYY-MM-DD day as the design writes dates. */
export function day(value: string | null | undefined): string {
  const date = fromApiDate(value)
  return date ? formatDate(date) : text(value)
}

/** Present as a share of the roll. A class with nobody on it is not 0%. */
export function rate(present: number, roll: number): string {
  return roll > 0 ? `${Math.round((present / roll) * 100)}%` : BLANK
}

/** What the day's registers add up to, across every class. */
export function dayTotals(rows: AttendanceClassCount[] | undefined): {
  roll: number
  present: number
} {
  return (rows ?? []).reduce(
    (total, row) => ({
      roll: total.roll + (row.total_students ?? 0),
      present: total.present + (row.present_count ?? 0),
    }),
    { roll: 0, present: 0 },
  )
}

/**
 * The three figures over the day.
 *
 * Read off `today`, which is scoped to the date asked for. The endpoint also
 * sends an `overall` block, which is every record the school has ever taken
 * whatever date is asked for — it is deliberately not used here, because a
 * figure beside a date picker that ignores the date is worse than no figure.
 */
export function dashboardTiles(dashboard: AttendanceDashboard | undefined) {
  const { roll, present } = dayTotals(dashboard?.today)
  return [
    { label: 'On roll', value: formatCount(roll) },
    { label: 'Present', value: formatCount(present) },
    { label: 'Marked present', value: rate(present, roll) },
  ]
}

/** One class or arm on the day, as the dashboard table lists it. */
export function classCountRow(count: AttendanceClassCount): Row {
  return {
    // A class with no arms has a null arm id, so the class id alone would
    // collide with nothing — but two arms of one class share `department_id`.
    id: `${count.department_id}-${count.class_arm_id ?? 'none'}`,
    klass: text(count.department_name),
    roll: formatCount(count.total_students ?? 0),
    present: formatCount(count.present_count ?? 0),
    rate: rate(count.present_count ?? 0, count.total_students ?? 0),
    class_arm_id: count.class_arm_id === null ? '' : String(count.class_arm_id),
    department_id: String(count.department_id),
  }
}

/** One mark, as the report lists it. */
export function recordRow(record: AttendanceRecord): Row {
  return {
    id: String(record.id),
    when: day(record.attendance_date),
    student: text(record.student?.name),
    adm: text(record.student?.regno),
    klass: [record.student?.department, record.student?.class_arm]
      .filter(Boolean)
      .join(' · ') || BLANK,
    status: titleCase(record.status),
    marked: text(record.teacher?.name),
    notes: text(record.notes),
  }
}

/** The breakdown over the range, in the order a register is read. */
export function reportTiles(report: AttendanceReport | undefined) {
  const stats = report?.stats
  return [
    { label: 'Present', value: formatCount(stats?.present ?? 0) },
    { label: 'Absent', value: formatCount(stats?.absent ?? 0) },
    { label: 'Late', value: formatCount(stats?.late ?? 0) },
    { label: 'Excused', value: formatCount(stats?.excused ?? 0) },
  ]
}

/** What the report was asked for, with the sentinels and blanks left off. */
export function reportParams(input: {
  start?: string | null
  end?: string | null
  klass?: string | null
  arm?: string | null
  status?: string | null
}): AttendanceExportParams {
  const id = (value: string | null | undefined) =>
    value && value !== ANY ? Number(value) : undefined
  return {
    ...(input.start ? { start_date: input.start } : {}),
    ...(input.end ? { end_date: input.end } : {}),
    ...(id(input.klass) ? { department_id: id(input.klass) } : {}),
    ...(id(input.arm) ? { class_arm_id: id(input.arm) } : {}),
    ...(input.status && input.status !== ANY ? { status: input.status } : {}),
  }
}

/**
 * The dates the endpoint actually used, which are not always the ones asked
 * for — an empty range is the current month, and the page has to say which
 * days the breakdown above it is about.
 */
export function coveringLabel(report: AttendanceReport | undefined): string {
  return (
    rangeLabel(report?.filters?.start_date ?? '', report?.filters?.end_date ?? '') ||
    'this month'
  )
}

/**
 * What the saved file is called. Named for the range it holds rather than the
 * day it was taken, so two exports of different months do not overwrite each
 * other in the downloads folder.
 */
export function exportFilename(report: AttendanceReport | undefined): string {
  const from = report?.filters?.start_date
  const to = report?.filters?.end_date
  const span = from && to ? (from === to ? from : `${from}_${to}`) : 'all'
  return `attendance_${span}.csv`
}

/** An arm as this endpoint spells it, for the filter's dropdown. */
export function armOption(arm: AttendanceClassArm): { value: string; label: string } {
  return { value: String(arm.id), label: arm.arm_name?.trim() || `Arm ${arm.id}` }
}

/**
 * The classes, told apart — the shared rule, over this endpoint's own rows.
 * `admin-attendances/departments` answers with raw department rows rather
 * than the options feed, so the mapping happens here and the disambiguating
 * is left to `distinct`.
 */
export function classOptions(
  departments: AttendanceDepartment[] | undefined,
): { value: string; label: string }[] {
  return distinct(
    (departments ?? []).map((department) => ({
      value: String(department.id),
      label: department.name?.trim() || `Class ${department.id}`,
      meta: department.deptcode?.trim() === department.name?.trim()
        ? ''
        : (department.deptcode ?? ''),
    })),
  )
}
