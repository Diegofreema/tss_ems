import { queryOptions } from '@tanstack/react-query'
import { timetableKeys } from '@/api/timetables/keys'
import { timetablesService } from '@/api/timetables/service'
import type { ClassTimetable } from '@/api/timetables/types'
import type { Id } from '@/api/types'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'

/**
 * The class grid, asked for the same way by every portal that draws one.
 *
 * A timetable belongs to a class, not to a person: a teacher reads several of
 * them, a parent one per child, the office any of them. So the id is the only
 * thing that differs and the query is shared.
 */

/**
 * Exactly the classes this account may open — its own for a pupil, one per
 * child for a guardian, all of them for staff. The server's own answer, so no
 * page has to decide it from a role.
 */
export const timetableClassesQuery = queryOptions({
  queryKey: timetableKeys.classes(),
  queryFn: () => timetablesService.classes(),
})

/**
 * One class's week, for the term the school is in.
 *
 * Asked without a term: a timetable is drawn per term, and the server picks
 * the current one. Nothing on `GET /semesters` says which that is, so a term
 * picker here would be guessing at what the server already knows.
 *
 * A refusal is answered rather than thrown. Every page that uses this asks for
 * several weeks at once — one per class, one per child — and a single one the
 * server will not open (403 for a class closed to the caller) would otherwise
 * take the rest of the page down with it. The reason is kept and shown in that
 * week's own place.
 */
export const classTimetableQuery = (id: Id) =>
  queryOptions({
    queryKey: timetableKeys.forClass(String(id), {}),
    queryFn: () =>
      timetablesService.forClass(id).catch(
        (error: unknown): ClassTimetable => ({
          days: [],
          period_count: 0,
          message: errorMessage(error, OFFLINE_MESSAGE),
        }),
      ),
  })
