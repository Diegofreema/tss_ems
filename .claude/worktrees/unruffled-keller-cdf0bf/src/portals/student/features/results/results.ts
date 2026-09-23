import type { Mark, MyMarks } from '../../../../api/results/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import { looseNumber, pick } from '../../../../features/collections/loose.ts'
import { mark } from '../../../../features/collections/mark.ts'
import { newestFirst } from '../../../../features/collections/newest.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { when } from '../../../../features/collections/when.ts'
import { text } from '../../../../features/profile/record.ts'

/**
 * The pupil's own results, off `GET /results/mine`.
 *
 * Released marks only — the endpoint never sends one still with the office, so
 * there is no approval column here: every row on this page has already been
 * through it. **A mark still in the queue is not a result**, and a correction
 * puts one back there, so a subject can disappear from this page again.
 *
 * This used to read `students/me/results`, which answered `{results: []}` for
 * every pupil ever probed. The new controller's own pupil route sends the
 * released marks *and* the term average, which is a figure this page had no
 * way to show before.
 *
 * **The envelope is unverified** — `marksOf` and `termAverage` below are the
 * only two places that read it, and one live answer retires both guesses.
 */

/** The marks out of the envelope, whichever key carries them. */
export function marksOf(answer: MyMarks | undefined): Mark[] {
  if (!answer) return []
  for (const key of ['results', 'marks', 'items', 'data']) {
    if (Array.isArray(answer[key])) return answer[key] as Mark[]
  }
  const found = Object.values(answer).find(Array.isArray)
  return (found as Mark[] | undefined) ?? []
}

/**
 * The term average the endpoint worked out, or nothing where it sent none.
 *
 * Nothing rather than nought: an average of no marks is not zero, it is a
 * figure there is nothing to compute — and a pupil shown "0" for a term they
 * have not been marked in has been told something false about themselves.
 */
export function termAverage(answer: MyMarks | undefined): number | undefined {
  if (!answer) return undefined
  const summary = answer.summary
  const direct = pick(answer, 'average', 'term_average', 'avg', 'mean')
  const nested =
    summary && typeof summary === 'object'
      ? pick(summary as Record<string, unknown>, 'average', 'term_average', 'avg', 'mean')
      : undefined
  return looseNumber(direct ?? nested)
}

/** Which term a mark belongs to, e.g. "First Term · 2024/2025". */
export function termOf(result: Mark): string {
  return (
    [result.semester?.name, result.session?.name]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' · ') || BLANK
  )
}

export function resultRows(results: Mark[]): Row[] {
  return newestFirst(results).map((result) => ({
    id: String(result.id),
    // A mark whose subject was not expanded still has to be nameable: the row
    // is what a pupil would read out to a teacher who disputes it.
    subject: result.subject?.name?.trim() || `Subject ${result.subject_id ?? result.id}`,
    term: termOf(result),
    // `first_exam` is the examination and the two CAs and the project are the
    // rest; `total` is the four summed by the school rather than here — a
    // total that disagrees with its parts is the school's own arithmetic, and
    // correcting it here would hide that.
    exam: mark(result.first_exam ?? result.score),
    total: mark(result.total),
    grade: text(result.grade),

    // Read by the record panel rather than the table: four numeric columns
    // beside the total is a spreadsheet, not a result sheet.
    firstCa: mark(result.first_ca ?? result.ca),
    secondCa: mark(result.second_ca),
    homework: mark(result.homework_project),
    klass: text(result.department?.name),
    session: text(result.session?.name),
    // The panel has a row for the session already, so its term is the term
    // alone; the table's `term` carries both, having no room for two columns.
    semester: text(result.semester?.name),
    remark: text(result.remark),
    filed: when(result.uploaddate, true),
  }))
}
