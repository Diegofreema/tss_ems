import type { MyCourse, MyCourses } from '../../../../api/my-schooling/types.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { text } from '../../../../features/profile/record.ts'

/**
 * The subjects the pupil is registered for, off `GET /students/me/courses`.
 *
 * Three columns where the design has five. "Periods / wk" would be counted off
 * the timetable, which has its own page and its own endpoint; a subject's
 * periods are not on this answer, and a count copied between two pages is one
 * more thing to fall out of step. "CA so far" is a mark, and marks have their
 * own page: the results endpoint is the school's approved record of them, and
 * a second copy here would be a number a pupil could read two ways.
 *
 * The class, the session and the term are the registration's, not each
 * subject's — they arrive once, beside the list, so they belong on the record
 * a row opens rather than in a column repeating itself down the page.
 */

/** Who teaches a subject, however many of them there are. Plain names here. */
export function teachersOf(course: MyCourse): string {
  const names = (course.teachers ?? []).map((name) => name?.trim()).filter(Boolean)
  return names.length ? names.join(', ') : text(null)
}

/** The class the registration was made against, arm and all. */
export function classOf(answer: MyCourses): string {
  const klass = answer.class
  // The school's own words for both. They disagree on live data — class "SSS I"
  // against arm "JSS 2 A" — and neither is ours to correct.
  const parts = [klass?.name?.trim(), klass?.arm?.trim()].filter(Boolean)
  return parts.length ? parts.join(' · ') : text(null)
}

/**
 * By name rather than by id. A subject list is not a chronology — a pupil
 * scans it for one subject, and the alphabet is where they look first.
 */
function byName(courses: MyCourse[]): MyCourse[] {
  return [...courses].sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
}

/** A subject that was sent without its name is still nameable by its id. */
function nameOf(course: MyCourse): string {
  return course.name?.trim() || `Subject ${course.id}`
}

export function courseRows(answer: MyCourses): Row[] {
  const klass = classOf(answer)
  return byName(answer.courses ?? []).map((course) => ({
    id: String(course.id),
    code: text(course.subjectcode),
    name: nameOf(course),
    teacher: teachersOf(course),
    klass,
    session: text(answer.session?.name),
    term: text(answer.semester?.name),
  }))
}
