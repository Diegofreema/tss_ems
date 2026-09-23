import type {
  AtRiskPupil,
  AttendanceVsMarksRow,
  ClassSubjectPerformance,
  GradeBucket,
  GradeCounts,
  Mover,
  PerformanceSubject,
  PerformanceTerm,
} from '../../api/performance/types.ts'
import { looseNumber, looseText, pick } from '../collections/loose.ts'

/**
 * Reading the performance rows. Most of these have now been seen filled in.
 *
 * This was written against empty arrays: every envelope `/performance` sends
 * was verified, and every *row* inside one came back empty, because the school
 * held five marks and none of them approved. So each field was read for the
 * first of several candidate spellings, under test, rather than pinned to one
 * guess that would draw a blank column for ever if it turned out to be wrong.
 *
 * The school has approved marks now, and the rows have been read against the
 * live answers. What that swept up:
 *
 * - `overall.grades` is a **map**, not rows — see `gradeLines`, which is where
 *   the guess actually broke a page rather than merely blanking a column.
 * - A subject's gap is `gap_to_own_average`, which none of the candidates
 *   spelled; it was being recomputed from the student's own average instead.
 * - A term row carries both `semester` and `term`, and its id repeats across
 *   years — see `termLines`.
 * - `classSubjectLines`, `riskLines` and `studentPointLines` were already
 *   right: `subject`/`average`/`highest`/`lowest`/`spread`/`pass_rate`/
 *   `marks_counted`, and `name`/`average`/`attendance_rate`/`reasons`.
 *
 * **`moverLines` is still unverified**, and is the only one left. `movers`,
 * `risers` and `fallers` are empty on every scope this school can answer for —
 * "No pupil has an approved average in both terms" — so its candidate keys are
 * still guesses. It is also the shape most likely to break the way `grades`
 * did, so read it against a real answer before trusting the Who-moved view.
 *
 * A row that matches none of the candidates comes back named but blank, which
 * a table shows as a dash — never as a zero, which would read as a child who
 * scored nothing.
 */

/** A row's own name, and a key that is stable within its list. */
export type Named = { key: string; name: string }

/** One term of a student's history: what it was called, and what they averaged. */
export type TermLine = Named & { average: number | undefined }

/** One subject against the student's own average. */
export type SubjectLine = Named & {
  average: number | undefined
  /** Points above or below the student's own average. Undefined without both. */
  gap: number | undefined
}

/** One subject across a class. `spread` is what separates two equal averages. */
export type ClassSubjectLine = Named & {
  average: number | undefined
  highest: number | undefined
  lowest: number | undefined
  spread: number | undefined
  passRate: number | undefined
  counted: number | undefined
}

/** How many students fall in one grade band. */
export type GradeLine = Named & { count: number }

/** A student whose average moved between two terms. */
export type MoverLine = Named & {
  from: number | undefined
  to: number | undefined
  /** Positive for a riser. Worked out from the two ends where it is not sent. */
  change: number | undefined
}

/** A student's attendance beside their average — one point of the scatter. */
export type StudentPointLine = Named & {
  attendance: number | undefined
  average: number | undefined
}

/** A student the thresholds picked out, and the school's own reasons why. */
export type RiskLine = Named & {
  reasons: string[]
  average: number | undefined
  attendance: number | undefined
}

const NAME_KEYS = ['name', 'student_name', 'fullname', 'full_name', 'student', 'pupil']
const SUBJECT_KEYS = ['subject_name', 'subject', 'name', 'title', 'label']
/*
 * `term` first, and it is the whole label: the school sends both `semester`
 * ("First Term") and `term` ("First Term 2025/2026") on the same row, and a
 * student's history runs across years — two bars reading "FIRST TERM" say
 * nothing about which year is which.
 */
const TERM_KEYS = ['term', 'semester', 'label', 'name', 'title']
const AVERAGE_KEYS = ['average', 'avg', 'mean', 'score', 'percentage', 'total']

/**
 * A student's terms, oldest first as the endpoint sends them.
 *
 * Keyed on the session *and* the semester, not the semester alone. A term row
 * carries `semester_id: 1` for the First Term of every year the student has
 * been at the school, so `named`'s own key collided the moment a second year
 * arrived — React drew one bar for two terms, and the chart quietly lost a
 * year of history. Only one term is on file at this school, which is exactly
 * why it had to be reasoned about rather than looked at.
 */
export function termLines(rows: readonly PerformanceTerm[]): TermLine[] {
  return rows.map((row, index) => {
    const line = named(row, index, TERM_KEYS, 'Term')
    const session = pick(row, 'session_id', 'session')
    return {
      ...line,
      key: session === undefined ? line.key : `${String(session)}:${line.key}`,
      average: number(row, AVERAGE_KEYS),
    }
  })
}

/**
 * The subjects, each with the gap to the student's own average.
 *
 * The gap is the point of this endpoint: a child on 55 who scores 80
 * everywhere else is struggling, and a child on 55 in a class averaging 40 is
 * not. It is worked out here where the server did not send it, and read
 * where it did.
 */
export function subjectLines(
  rows: readonly PerformanceSubject[],
  ownAverage: number | null,
): SubjectLine[] {
  return rows.map((row, index) => {
    const average = number(row, AVERAGE_KEYS)
    // `gap_to_own_average` is what the school actually sends, and it is the
    // school's own arithmetic — read rather than recomputed, so this column
    // cannot drift from the figure the endpoint stands behind. The rest are
    // the spellings guessed before any answer had a row in it.
    const sent = number(row, [
      'gap_to_own_average',
      'gap',
      'difference',
      'delta',
      'vs_own_average',
    ])
    return {
      ...named(row, index, SUBJECT_KEYS, 'Subject'),
      average,
      gap:
        sent ??
        (average !== undefined && ownAverage !== null
          ? round(average - ownAverage)
          : undefined),
    }
  })
}

export function classSubjectLines(
  rows: readonly ClassSubjectPerformance[],
): ClassSubjectLine[] {
  return rows.map((row, index) => ({
    ...named(row, index, SUBJECT_KEYS, 'Subject'),
    average: number(row, AVERAGE_KEYS),
    highest: number(row, ['highest', 'max', 'maximum', 'best', 'top']),
    lowest: number(row, ['lowest', 'min', 'minimum', 'worst', 'bottom']),
    spread: number(row, ['spread', 'stdev', 'std_dev', 'standard_deviation', 'range']),
    passRate: number(row, ['pass_rate', 'passrate', 'pass_percentage', 'passed']),
    counted: number(row, ['marks_counted', 'counted', 'marks', 'pupils', 'students']),
  }))
}

/**
 * The grade breakdown, from whichever of the two shapes arrives.
 *
 * The school sends a map — `{"-": 2, "A": 5, "B": 1}`, band to count — which
 * is what it actually does now that there are approved marks to count. This
 * read an array of rows while every live answer was empty, and calling `.map`
 * on the map threw `rows.map is not a function` straight through the class
 * performance page's render: the page said it could not reach the school,
 * about an answer the school had already given in full.
 *
 * Both are taken. The rows branch is what this was written and tested against
 * and costs four lines to keep; the map is the one anybody will actually meet.
 * Bands are ordered as the endpoint sent them, which puts `-` first — the
 * marks carrying no letter, a real band with a real count rather than a blank
 * to drop.
 */
export function gradeLines(
  rows: readonly GradeBucket[] | GradeCounts | null | undefined,
): GradeLine[] {
  if (!rows) return []
  if (!Array.isArray(rows)) {
    return Object.entries(rows).map(([band, count], index) => ({
      key: `${index}:${band}`,
      name: band.trim() || 'Grade',
      count: Number(count) || 0,
    }))
  }
  return rows.map((row, index) => ({
    ...named(row, index, ['grade', 'label', 'name', 'band'], 'Grade'),
    count: number(row, ['count', 'total', 'pupils', 'students']) ?? 0,
  }))
}

/**
 * The movers, with the change worked out from the two ends where the server
 * did not send it — so a list can be ordered by how far somebody moved
 * whichever way this answer happens to be spelled.
 */
export function moverLines(rows: readonly Mover[]): MoverLine[] {
  return rows.map((row, index) => {
    const from = number(row, ['from', 'from_average', 'before', 'previous', 'was'])
    const to = number(row, ['to', 'to_average', 'after', 'current', 'now'])
    const sent = number(row, ['change', 'delta', 'difference', 'movement'])
    return {
      ...named(row, index, NAME_KEYS, 'Student'),
      from,
      to,
      change:
        sent ?? (from !== undefined && to !== undefined ? round(to - from) : undefined),
    }
  })
}

export function studentPointLines(
  rows: readonly AttendanceVsMarksRow[],
): StudentPointLine[] {
  return rows.map((row, index) => ({
    ...named(row, index, NAME_KEYS, 'Student'),
    attendance: number(row, ['attendance', 'attendance_rate', 'rate', 'present_rate']),
    average: number(row, AVERAGE_KEYS),
  }))
}

/**
 * The flagged students and the figures that flagged them.
 *
 * `reasons` is the one field name with any evidence behind it — the API
 * collection's own test asserts every row carries a non-empty array of them —
 * and it is what makes this list safe to show at all: a student listed without
 * the reason is an accusation, and a student listed with it is a prompt a
 * teacher can disagree with.
 */
export function riskLines(rows: readonly AtRiskPupil[]): RiskLine[] {
  return rows.map((row, index) => ({
    ...named(row, index, NAME_KEYS, 'Student'),
    reasons: reasonsOf(row),
    average: number(row, AVERAGE_KEYS),
    attendance: number(row, ['attendance', 'attendance_rate', 'rate']),
  }))
}

/** Which way a student is going, as a tone rather than a colour decision. */
export function directionTone(direction: string | null): 'up' | 'down' | 'muted' {
  const word = (direction ?? '').toLowerCase()
  if (/(up|ris|improv|better|gain)/.test(word)) return 'up'
  if (/(down|fall|declin|worse|drop)/.test(word)) return 'down'
  return 'muted'
}

/** A figure as a table cell shows it: one decimal, or a dash for nothing. */
export function figure(value: number | undefined | null, suffix = ''): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—'
  const rounded = round(value)
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}${suffix}`
}

/** A gap or a change, always signed, so "+4" reads as movement rather than a mark. */
export function signed(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  const rounded = round(value)
  const shown = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return rounded > 0 ? `+${shown}` : shown
}

function named(
  row: Record<string, unknown>,
  index: number,
  keys: string[],
  fallback: string,
): Named {
  const read = looseText(pick(row, ...keys))
  return {
    key: String(pick(row, 'id', 'student_id', 'subject_id', 'semester_id') ?? `row-${index}`),
    name: read === '—' ? `${fallback} ${index + 1}` : read,
  }
}

function number(row: Record<string, unknown>, keys: string[]): number | undefined {
  const value = pick(row, ...keys)
  return value === undefined ? undefined : looseNumber(value)
}

function reasonsOf(row: Record<string, unknown>): string[] {
  const value = pick(row, 'reasons', 'why', 'flags')
  if (Array.isArray(value)) {
    return value.map((one) => looseText(one)).filter((one) => one !== '—')
  }
  return typeof value === 'string' && value.trim() ? [value.trim()] : []
}

const round = (value: number) => Math.round(value * 10) / 10
