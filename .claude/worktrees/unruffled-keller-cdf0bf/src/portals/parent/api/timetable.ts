import { queryOptions } from '@tanstack/react-query'
import { timetableKeys } from '@/api/timetables/keys'
import { timetablesService } from '@/api/timetables/service'

/**
 * `GET /timetables/children` — the whole household's week in one call.
 *
 * The guardian's own endpoint: it resolves the caller from the token and needs
 * no parent id, unlike the rest of this portal, which is id-scoped because
 * `/sparents/my-*` cannot. Asked without a `student_id`, which it treats as
 * every child.
 *
 * Asked without a term as well: a timetable is drawn per term and the server
 * picks the one the school is in. Nothing on `GET /semesters` names it, so a
 * picker here would be guessing at what the server already knows.
 */
export const childrenTimetablesQuery = queryOptions({
  queryKey: timetableKeys.children({}),
  queryFn: () => timetablesService.children(),
})
