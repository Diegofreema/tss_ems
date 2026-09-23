import type { Period, PeriodBody, PeriodEditBody } from '../../../api/timetables/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'

/**
 * A timetable period as the office reads and writes one.
 *
 * The endpoint sends the row flat, with the names resolved beside the ids —
 * `subject_name`, `class_name`, `session_name`, `semester_name` — so a register
 * of periods costs one request and no name feeds. `/timetables/{id}` sends the
 * same flat row despite promising resolved records, which is why the register
 * and the record it opens share this one builder.
 */

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

function id(value: number | null | undefined): string {
  return value == null ? '' : String(value)
}

/**
 * "08:56 – 10:56". Both are the school's wall clock, sent without a zone and
 * without seconds, so they are printed as they arrive.
 */
export function periodTime(period: Period): string {
  const from = period.start_time?.trim()
  const to = period.end_time?.trim()
  if (from && to) return `${from} – ${to}`
  return text(from || to)
}

/**
 * What the period is for. The server resolves it into `label`, and that is
 * preferred over working it out again here. The `title` fallback stays: the
 * office no longer sets one, but a period made elsewhere with a bare name
 * still reads by that name rather than as a dash.
 */
export function periodLabel(period: Period): string {
  return period.label?.trim() || period.subject_name?.trim() || period.title?.trim() || BLANK
}

export function periodRow(period: Period): Row {
  return {
    id: String(period.id),
    klass: text(period.class_name),
    day: text(period.day_of_week),
    time: periodTime(period),
    subject: periodLabel(period),

    // Read by the record panel and by the edit form, not by the table.
    session: text(period.session_name),
    term: text(period.semester_name),
    start_time: period.start_time?.trim() ?? '',
    end_time: period.end_time?.trim() ?? '',
    day_of_week: text(period.day_of_week),
    department_id: id(period.department_id),
    subject_id: id(period.subject_id),
    session_id: id(period.session_id),
    semester_id: id(period.semester_id),
  }
}

/**
 * One period as a class's own timetable tab reads it — the week down the page,
 * so the class it belongs to is the record above and not a column repeating
 * itself. `/timetables/class/{id}` sends the same flat rows the register does.
 */
export function classPeriodRow(period: Period): Row {
  return {
    id: String(period.id),
    day: text(period.day_of_week),
    time: periodTime(period),
    subject: periodLabel(period),
  }
}

/** What is lost with the period. A slot in a week, and nothing hangs off it. */
export function periodDeleteBody(row: Row): string {
  const what = [row.subject, row.klass].filter((part) => part && part !== BLANK).join(' · ')
  return `${what || 'This period'} on ${row.day} at ${row.time} will be taken off the timetable. Nothing else is affected — a period holds no marks and no register.`
}

function value(input: unknown): string | undefined {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined
}

function asId(input: unknown): number | undefined {
  const parsed = Number(input)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/**
 * The form as `POST /timetables` wants it.
 *
 * The office sets a subject, never a bare `title`: the endpoint takes either
 * and refuses neither with 422, and the form asks for the subject. `title` is
 * still sent, as null — a period that had one and is edited here becomes the
 * subject it was given, rather than keeping a name nobody can see any more.
 *
 * Both term ids are left out when unset, which is what makes the endpoint fall
 * back to the current term. Sending an empty one would file the period under
 * no term at all.
 */
export function periodBody(values: Record<string, unknown>): PeriodBody {
  return {
    department_id: asId(values.department_id) as number,
    day_of_week: value(values.day_of_week) as PeriodBody['day_of_week'],
    start_time: value(values.start_time) ?? '',
    end_time: value(values.end_time) ?? '',
    subject_id: asId(values.subject_id) ?? null,
    title: value(values.title) ?? null,
    session_id: asId(values.session_id),
    semester_id: asId(values.semester_id),
  }
}

/**
 * The same body for `PUT /timetables/{id}`, which is partial. The form shows
 * every field, so every field is sent: a partial update built from a whole
 * form would leave behind whatever the office had just cleared.
 */
export function periodEditBody(values: Record<string, unknown>): PeriodEditBody {
  return periodBody(values)
}
