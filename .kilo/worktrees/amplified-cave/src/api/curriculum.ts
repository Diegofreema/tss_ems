import type { QueryClient } from '@tanstack/react-query'
import { classArmKeys } from './class-arms/keys'
import { departmentKeys } from './departments/keys'
import { subjectKeys } from './subjects/keys'
import { teacherKeys } from './teachers/keys'
import { teachingKeys } from './teaching/keys'

/**
 * Who teaches what, in which class.
 *
 * That one fact is stored against the class, against the subject, against the
 * teacher and again on the teacher's own "my subjects" view, and the API lets
 * it be written from any of those four ends. Each write used to drop only the
 * end it was written from, so assigning a subject to a class left the subject's
 * own record insisting it was not taught there — the same disagreement,
 * whichever way round it was entered.
 */
export function dropCurriculumReads(queryClient: QueryClient): void {
  const roots = [
    departmentKeys.all,
    subjectKeys.all,
    teacherKeys.all,
    teachingKeys.all,
    classArmKeys.all,
  ]
  for (const queryKey of roots) queryClient.invalidateQueries({ queryKey })
}
