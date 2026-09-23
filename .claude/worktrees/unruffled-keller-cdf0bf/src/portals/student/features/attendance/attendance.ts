import type { MyAttendance } from '../../../../api/attendance/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import { looseNumber, pick } from '../../../../features/collections/loose.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { when } from '../../../../features/collections/when.ts'
import { capitalise } from '../../../../lib/format.ts'

/**
 * A pupil's own register, off `GET /attendances/mine`.
 *
 * Unverified — no pupil login has read it — so the envelope, the row and the
 * figures are each read for the first key that carries something, and the
 * candidate lists below are the guess. One live answer retires them.
 */

type Loose = Record<string, unknown>

const LIST_KEYS = ['attendance', 'attendances', 'records', 'marks', 'items', 'data', 'days']
const STATS_KEYS = ['stats', 'summary', 'totals', 'figures']
const DATE_KEYS = ['attendance_date', 'date', 'day', 'marked_on']
const STATUS_KEYS = ['status', 'mark', 'state']
const NOTE_KEYS = ['notes', 'note', 'remark', 'comment']
const RATE_KEYS = ['rate', 'percentage', 'percent', 'attendance_rate']
const MARKED_KEYS = ['total', 'days_marked', 'marked', 'total_records', 'records']

function rows(answer: MyAttendance | undefined): Loose[] {
  if (Array.isArray(answer)) return answer as Loose[]
  const list = pick(answer as Loose | undefined, ...LIST_KEYS)
  return Array.isArray(list) ? (list as Loose[]) : []
}

/** Every day somebody marked this pupil, newest first. */
export function marksOf(answer: MyAttendance | undefined): Loose[] {
  return [...rows(answer)].sort((one, two) =>
    String(pick(two, ...DATE_KEYS) ?? '').localeCompare(String(pick(one, ...DATE_KEYS) ?? '')),
  )
}

function text(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

/** One day, as the form teacher marked it. */
export function markRow(record: Loose, index: number): Row {
  const date = text(pick(record, ...DATE_KEYS))
  const at = new Date(date)
  const dated = date !== '' && !Number.isNaN(at.getTime())

  return {
    // The mark's own id where it has one; otherwise the day, which is unique
    // per pupil — one row per pupil per day is the endpoint's own rule.
    id: String(looseNumber(pick(record, 'id', 'attendance_id')) ?? date ?? index) || String(index),
    date: when(date),
    day: dated ? at.toLocaleDateString('en-NG', { weekday: 'long' }) : BLANK,
    state: capitalise(text(pick(record, ...STATUS_KEYS))) || BLANK,
    note: text(pick(record, ...NOTE_KEYS)) || BLANK,
  }
}

export function attendanceRows(answer: MyAttendance | undefined): Row[] {
  return marksOf(answer).map(markRow)
}

function stats(answer: MyAttendance | undefined): Loose | undefined {
  const found = pick(answer as Loose | undefined, ...STATS_KEYS)
  return found && typeof found === 'object' ? (found as Loose) : undefined
}

/** How many days carry a given mark, counted off the rows the school sent. */
export function countOf(answer: MyAttendance | undefined, status: string): number {
  const held = looseNumber(pick(stats(answer), status))
  if (held !== undefined) return held
  return marksOf(answer).filter(
    (record) => text(pick(record, ...STATUS_KEYS)).toLowerCase() === status,
  ).length
}

/** Days somebody actually took a register on. */
export function daysMarked(answer: MyAttendance | undefined): number {
  return looseNumber(pick(stats(answer), ...MARKED_KEYS)) ?? marksOf(answer).length
}

/**
 * The attendance rate, which is the school's own figure.
 *
 * It counts in-school over days **marked**, not over the length of term: only
 * the days somebody took a register are evidence. Recomputing it here would be
 * a second opinion on a number the school already has one of, and a term
 * nobody marked would come out as nought per cent — which is a school that
 * took no register, not a child who missed every day.
 */
export function attendanceRate(answer: MyAttendance | undefined): number | undefined {
  if (daysMarked(answer) === 0) return undefined
  return looseNumber(pick(stats(answer), ...RATE_KEYS))
}
