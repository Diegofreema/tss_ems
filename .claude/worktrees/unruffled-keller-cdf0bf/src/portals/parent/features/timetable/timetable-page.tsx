import { useSuspenseQuery } from '@tanstack/react-query'
import { parseAsString, useQueryState } from 'nuqs'
import { SectionHeading } from '@/components/common/section-heading'
import { SegmentedControl } from '@/components/common/segmented-control'
import { Tag } from '@/components/common/tag'
import { EmptyState } from '@/components/feedback/empty-state'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { WeekCalendar } from '@/features/timetable/week-calendar'
import { childrenTimetablesQuery } from '../../api/timetable'
import { type ChildWeek, childWeeks } from './child-weeks'

/**
 * One child's week at a time, chosen on a tab.
 *
 * Family-wide rather than scoped to the shell's child switcher, and switched
 * here instead: the switcher names a child by first name and arm, which on a
 * household with two children of the same name in the same arm names neither.
 * These tabs carry whatever it takes to tell them apart.
 *
 * The choice lives in the URL, so a parent can keep a child's week open in a
 * tab, send the link, or come back to the same one.
 */
export function ParentTimetablePage() {
  const { data: children } = useSuspenseQuery(childrenTimetablesQuery)
  const weeks = childWeeks(children, new Date())
  const [childId, setChildId] = useQueryState('child', parseAsString.withDefault(''))

  // The eldest on the school's list until a tab is pressed, and again if the
  // household changes under a link pointing at a child who has left.
  const showing = weeks.find((week) => week.id === childId) ?? weeks[0]

  if (!showing) {
    return (
      <>
        <Header />
        <EmptyState
          title="No child is linked to your account"
          body="Ask the school office to link your children to this account, and their week will appear here."
        />
      </>
    )
  }

  return (
    <>
      <Header />

      {/* Six children make a long row on a narrow screen, and a row that
          scrolls beats one that wraps into broken segments. */}
      {weeks.length > 1 && (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <SegmentedControl
            name="child"
            options={weeks.map((week) => ({ value: week.id, label: week.tab }))}
            value={showing.id}
            onChange={(id) => void setChildId(id)}
          />
        </div>
      )}

      <ChildWeekPanel week={showing} />
    </>
  )
}

function Header() {
  return (
    <>
      <PageHeader
        kicker="My children"
        title="Timetables"
        description="The school week for one child at a time. Hover a period for how long it runs and who takes it."
      />
      <Rule />
    </>
  )
}

function ChildWeekPanel({ week }: { week: ChildWeek }) {
  return (
    <section className="mt-5">
      <SectionHeading
        action={
          week.total > 0 ? (
            <Tag variant="accent">
              {week.total} period{week.total === 1 ? '' : 's'} a week
            </Tag>
          ) : (
            <Tag>Not drawn yet</Tag>
          )
        }
      >
        {week.name} · {week.klass}
      </SectionHeading>

      <div className="mt-3">
        {week.total === 0 ? (
          <p className="border-2 border-divider px-4 py-5 text-[13px] text-muted-foreground">
            {/* The school's own sentence where it sent one. */}
            {week.message ?? 'No timetable yet for this class.'}
          </p>
        ) : (
          // No `onOpen`: the parent portal publishes no page for one period,
          // and everything a period holds is on the hover already.
          <WeekCalendar columns={week.columns} />
        )}
      </div>
    </section>
  )
}
