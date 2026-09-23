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
import {
  type ClassWeek,
  classWeeks,
  mySubjectIds,
  noPeriodsYet,
  teachingSummary,
} from './class-weeks'

/**
 * The classes this teacher has a period in, each drawn as its own week, with
 * their own periods marked.
 *
 * The classes come from the server rather than from the teacher's record:
 * `GET /timetables/classes` answers with exactly what the account may read, so
 * a class missing from this page is either the API's decision or a class
 * holding nothing of theirs, and not a role check made here. Each week is then
 * a separate call, keyed by class id — every class is still read, because a
 * class is only known to hold a period of theirs once its week has been.
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
        description="Every class you have a period in, drawn as the school drew it. Your own periods are filled in and marked; the rest of the class's week is there for context."
      />
      <Rule />

      {/* Two ways to have nothing, and they are different facts: no class is
          open to this account at all, or classes are open and none of them
          has a period in one of this teacher's subjects. Saying the first
          about the second would send a teacher to the office over a timetable
          the office has not finished drawing. */}
      {weeks.length === 0 ? (
        <EmptyState
          title="No periods for you yet"
          body={
            classes.length === 0
              ? 'The school has not opened any class timetable to your account. Your subjects, and the class each belongs to, are on My subjects.'
              : noPeriodsYet(subjects)
          }
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
        {week.unreadable ? (
          /* The school's own reason, or the app's. Unlike the sentence this
             replaced, it is worth handing a teacher: "no timetable drawn yet"
             was the office's business, but "this class was refused to your
             account" is the teacher's, and it is the difference between a
             week nobody has entered and a week they are not being shown. */
          <p className="rounded-lg border border-divider bg-raised px-4 py-5 text-sm text-muted-foreground">
            {week.note ?? 'This class’s timetable could not be read just now.'}
          </p>
        ) : (
          // No empty case beyond that one: a class with periods drawn but none
          // of this teacher's never reaches the page. No `onOpen` either — the
          // teacher portal publishes no page for one period, and everything a
          // period holds is on the hover already.
          <WeekCalendar columns={week.columns} />
        )}
      </div>
    </section>
  )
}

/**
 * How much of a class's week is the teacher's, said before they read it.
 *
 * Two cases now, not four: a class reaching this page either holds a period of
 * theirs or could not be read at all, so "Not drawn yet" and "none yours" name
 * states no section here can be in.
 */
function WeekTag({ week }: { week: ClassWeek }) {
  if (week.unreadable) return <Tag>Could not be read</Tag>
  return (
    <Tag variant="accent">
      {week.mine} of {week.total} yours
    </Tag>
  )
}
