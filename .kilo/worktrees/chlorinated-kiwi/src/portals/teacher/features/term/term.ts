/**
 * Anything that carries a term. Both the teacher's own marks and the office's
 * results register spell it the same way, which is what lets one function read
 * either — see `termFromResults`.
 */
export type TermBearing = {
  session_id?: number | null
  semester_id?: number | null
  uploaddate?: string | null
  session?: { id: number; name: string } | null
  semester?: { id: number; name: string } | null
}

/**
 * Which term a teacher's marks are filed into.
 *
 * `POST /teachers/me/scores` and the results upload both want a session and a
 * term as ids, and a teaching login cannot read either: `/sessions`,
 * `/semesters` and `/settings` all answer "restricted to administrators". The
 * only place the school tells a teacher what term it is, is on their own
 * marks — which expand both, by id and by name.
 *
 * So the term is read off the newest mark they have — and, for a teacher who
 * has none, off the newest mark on the school's own results register, which
 * `/results` opens to any staff login. That second reading is what lets a
 * teacher file their very first mark: without it the sheet was permanently
 * unsaveable for anybody new, which is every teacher at the start of their
 * first term here.
 *
 * Both readings are the same arithmetic over the same fields, so one function
 * takes either shape.
 */
export type MarkingTerm = {
  session_id: number
  semester_id: number
  /** "First Term · 2024/2025", as the school itself spells them. */
  label: string
}

function at(stamp: string | null | undefined): number {
  const parsed = new Date(stamp ?? '').getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

export function termFromResults(results: readonly TermBearing[]): MarkingTerm | undefined {
  const newest = results.reduce<TermBearing | undefined>(
    (latest, result) =>
      !latest || at(result.uploaddate) > at(latest.uploaddate) ? result : latest,
    undefined,
  )
  if (!newest?.session_id || !newest.semester_id) return undefined

  return {
    session_id: newest.session_id,
    semester_id: newest.semester_id,
    label:
      [newest.semester?.name, newest.session?.name].filter(Boolean).join(' · ') ||
      `Term ${newest.semester_id} · session ${newest.session_id}`,
  }
}
