import { queryOptions } from '@tanstack/react-query'
import { teachingKeys } from '@/api/teaching/keys'
import { teachingService } from '@/api/teaching/service'

/**
 * What the teacher's timetable page reads on top of the shared class grid —
 * see `@/features/timetable/queries` for `timetableClassesQuery` and
 * `classTimetableQuery`.
 *
 * Neither of those names a teacher on a period: a period carries a
 * `subject_id` and nothing else about who takes it. `GET /teachers/me/subjects`
 * is the only thing that makes a period *theirs*, and since a subject belongs
 * to exactly one class, matching on the subject id alone is already
 * class-scoped.
 */

/** The subjects the office has put in this teacher's hands, class and all. */
export const mySubjectsQuery = queryOptions({
  queryKey: teachingKeys.subjects(),
  queryFn: () => teachingService.subjects(),
})
