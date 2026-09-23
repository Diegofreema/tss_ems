import type { MyMaterial } from '../../../../api/my-schooling/types.ts'
import { newestFirst } from '../../../../features/collections/newest.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { when } from '../../../../features/collections/when.ts'
import { text } from '../../../../features/profile/record.ts'

/**
 * The notes and assignments shared with the pupil's class, off
 * `GET /students/me/materials`.
 *
 * Three columns where the design has five. Type and Size are the file's own,
 * and this endpoint sends no file: the table holds no size, no format and no
 * address to fetch one from, so a column for either would be a guess printed
 * as a fact. What is left is the three things a pupil needs to find a
 * material — what it is called, which subject it belongs to, and when it
 * arrived.
 */
export function materialRows(materials: MyMaterial[]): Row[] {
  return newestFirst(materials).map((material) => ({
    id: String(material.id),
    // A material whose subject was not expanded still has to be nameable: an
    // untitled row is one a pupil cannot ask their teacher about.
    title: material.title?.trim() || `Material ${material.id}`,
    subject: material.subject?.name?.trim() || subjectFallback(material),
    added: when(material.uploaddate),

    // Read by the record panel rather than the table.
    klass: text(material.department?.name),
    sharedOn: when(material.uploaddate, true),
  }))
}

/** Which subject an unexpanded material belongs to, by its id alone. */
function subjectFallback(material: MyMaterial): string {
  return material.subject_id ? `Subject ${material.subject_id}` : text(null)
}
