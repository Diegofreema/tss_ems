import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import { SectionHeading } from '@/components/common/section-heading'
import { Tag } from '@/components/common/tag'
import { EmptyState } from '@/components/feedback/empty-state'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import {
  classTimetableQuery,
  timetableClassesQuery,
} from '@/features/timetable/queries'
import { WeekCalendar } from '@/features/timetable/week-calendar'
import { mySubjectsQuery } from '../../api/timetable'
import { type ClassWeek, classWeeks, mySubjectIds, teachingSummary } from './class-weeks'

/**
 * Every class this teacher may open, each drawn as its own week, with the
 * periods in their subjects marked.
 *
 * The classes come from the server rather than from the teacher's record:
 * `GET /timetables/classes` answers with exactly what the account may read, so
 * a class missing from this page is the API's decision and not a role check
 * made here. Each week is then a separate call, keyed by class id.
 */
export function TeacherTimetablePage() {
  const { data: classes } = useSuspenseQuery(timetableClassesQuery)
  const { data: subjects } = useSuspenseQuery(mySubjectsQuery)
  // One call per class. The route's loader has already awaited all of them, so
  // this reads the cache rather than suspending a second time.
  const grids = useSuspenseQueries({
    queries: classes.map((klass) => classTimetableQuery(klass.id)),
  })

  const weeks = classWeeks(
    classes.map((klass, at) => ({ klass, grid: grids[at].data })),
    mySubjectIds(subjects),
    new Date(),
  )

  return (
    <>
      <PageHeader
        kicker="Teaching"
        title="Class timetables"
        description="Every class you take a subject in, and every other class you may open. Your own periods are filled in and marked; the rest are there for context."
      />
      <Rule />

      {classes.length === 0 ? (
        <EmptyState
          title="No classes to show"
          body="The school has not opened any class timetable to your account. Your subjects, and the class each belongs to, are on My subjects."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{teachingSummary(weeks)}</p>

          {weeks.map((week) => (
            <ClassSection key={week.id} week={week} />
          ))}
        </>
      )}
    </>
  )
}

function ClassSection({ week }: { week: ClassWeek }) {
  return (
    <section className="mt-7">
      <SectionHeading action={<WeekTag week={week} />}>{week.label}</SectionHeading>

      <div className="mt-3">
        {week.total === 0 ? (
          <p className="border-2 border-divider px-4 py-5 text-[13px] text-muted-foreground">
            {/* Not the API's own sentence. Where the periods on file sit under
                a term the school is no longer in, it explains the school's
                session settings to whoever is reading — which is the office's
                business, not something to hand a teacher mid-lesson. */}
            No timetable yet for this class.
          </p>
        ) : (
          // No `onOpen`: the teacher portal publishes no page for one period,
          // and everything a period holds is on the hover already.
          <WeekCalendar columns={week.columns} />
        )}
      </div>
    </section>
  )
}

/** How much of a class's week is the teacher's, said before they read it. */
function WeekTag({ week }: { week: ClassWeek }) {
  if (week.total === 0) return <Tag>Not drawn yet</Tag>
  if (week.mine === 0) return <Tag>{week.total} periods, none yours</Tag>
  return (
    <Tag variant="accent">
      {week.mine} of {week.total} yours
    </Tag>
  )
}
