import { useNavigate } from '@tanstack/react-router'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { text } from '@/features/profile/record'
import { WeekCalendar } from '@/features/timetable/week-calendar'
import { periodTally, weekGrid } from '@/features/timetable/week-grid'
import { schoolingCourses, schoolingTimetable } from '@/db/collections/schooling'
import { useHeldDocument } from '@/db/live'
import { classOf, teacherFor } from './timetable'

/**
 * The student's week, drawn as the week rather than listed as rows.
 *
 * Two answers make it: `GET /timetables/mine` says what is taught when, and
 * `GET /students/me/courses` says who teaches it — a period carries a subject
 * id and no teacher, and the two endpoints number subjects the same way.
 *
 * The class, the session and the term are the grid's, not a period's: they
 * arrive once, beside `days`, so they are said once under the calendar instead
 * of repeating down every block.
 */
export function TimetablePage() {
  const navigate = useNavigate()
  // Read off the device rather than suspended on. There is nothing to suspend
  // on once the reading is local, and a paused request would never settle.
  const week = useHeldDocument(schoolingTimetable)
  const registered = useHeldDocument(schoolingCourses)
  const grid = week.doc
  const courses = registered.doc

  const columns =
    grid && courses
      ? weekGrid(grid, new Date(), (period) => ({
          teacher: teacherFor(period, courses),
        }))
      : []
  const tally = periodTally(columns)

  /** The block's full record — everything the hover says, and the term with it. */
  const openPeriod = (period: { id: string }) =>
    navigate({
      to: '/student/$collection/$recordId',
      params: { collection: 'timetable', recordId: period.id },
    })

  return (
    <>
      <PageHeader
        kicker="Learning"
        title="My timetable"
        description="Your week as the school teaches it. Hover a period — or open it — for how long it runs and who takes it."
      />
      <Rule />

      {week.pending || registered.pending ? (
        <TableSkeleton rows={5} />
      ) : !grid || tally === 0 ? (
        <EmptyState
          title="No timetable to show"
          // The API's own sentence is "No timetable has been entered for this
          // class yet." Said here in the student's terms, and pointing at the
          // page that does have their subjects on it.
          body="The office has not entered the week’s periods for your class yet. The subjects you take, and who teaches each, are on My subjects."
        />
      ) : (
        <>
          <WeekCalendar columns={columns} onOpen={openPeriod} />

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {classOf(grid)} · {text(grid.session?.name)} ·{' '}
              {text(grid.semester?.name)}
            </span>
            <span>
              {tally} period{tally === 1 ? '' : 's'} a week. The same week
              repeats until the office changes it.
            </span>
          </div>
        </>
      )}
    </>
  )
}
