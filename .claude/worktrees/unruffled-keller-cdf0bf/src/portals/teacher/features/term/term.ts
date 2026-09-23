import type { TeacherResult } from '../../../../api/teaching/types.ts'

/**
 * Which term a teacher's marks are filed into.
 *
 * `POST /teachers/me/scores` and the results upload both want a session and a
 * term as ids, and a teaching login cannot read either: `/sessions`,
 * `/semesters` and `/settings` all answer "restricted to administrators". The
 * only place the school tells a teacher what term it is, is on their own
 * marks — which expand both, by id and by name.
 *
 * So the term is read off the newest mark they have. That is right for a
 * teacher who has marked before and silent for one who has not: the first mark
 * of a teacher's first term cannot be filed through this API at all, and the
 * page says so rather than guessing at ids.
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

export function termFromResults(results: TeacherResult[]): MarkingTerm | undefined {
  const newest = results.reduce<TeacherResult | undefined>(
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
