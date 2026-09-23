import type {
  ChildResult,
  ChildResultParams,
  ResultSummary,
} from '../../../../api/parents/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { formatCount } from '../../../../lib/format.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/**
 * A mark as the sheet reads it. The API sends every figure as a decimal
 * string — "18.00" — and a result sheet is read in whole marks, so the
 * trailing nothings come off. Anything unreadable is shown as sent rather
 * than as a nought somebody could mistake for a score.
 */
export function mark(value: string | null | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) return BLANK
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? String(Math.round(parsed * 100) / 100) : trimmed
}

/**
 * What the results page asks for. An unset filter is left out entirely rather
 * than sent empty: the endpoint reads a blank `session_id` as no session at
 * all, and answers with nothing.
 */
export function resultParams(input: {
  session?: string | null
  term?: string | null
}): ChildResultParams {
  return {
    ...(input.session ? { session_id: Number(input.session) } : {}),
    ...(input.term ? { semester_id: Number(input.term) } : {}),
  }
}

/**
 * One subject on the sheet.
 *
 * `ca` and `score` are what the API adds together to reach `total`, so those
 * three are the register; the parts each was built from — the two assessments
 * and the first examination — are on the record panel, where a family
 * querying a mark can see where it came from.
 */
export function resultRow(result: ChildResult): Row {
  return {
    id: String(result.id),
    subject: text(result.subject),
    ca: mark(result.ca),
    exam: mark(result.score),
    total: mark(result.total),
    grade: text(result.grade),
    remark: text(result.remark),

    // Read by the record panel rather than the table.
    firstCa: mark(result.first_ca),
    secondCa: mark(result.second_ca),
    firstExam: mark(result.first_exam),
    session: text(result.session),
    term: text(result.semester),
  }
}

/**
 * The three figures over the sheet, counted by the API rather than by us — so
 * a subject the endpoint left out of the list is left out of the average too,
 * and the two cannot disagree.
 */
export function resultTiles(summary: ResultSummary | undefined) {
  return [
    { label: 'Subjects', value: formatCount(summary?.subjects ?? 0) },
    { label: 'Total marks', value: formatCount(summary?.total_marks ?? 0) },
    // An average of nothing is not nought; it is nothing to average.
    {
      label: 'Average',
      value: summary?.subjects ? String(Math.round((summary.average ?? 0) * 10) / 10) : BLANK,
    },
  ]
}
