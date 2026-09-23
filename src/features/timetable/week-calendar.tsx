import type { ReactNode } from 'react'
import { Clock, User } from 'lucide-react'
import { Tag } from '@/components/common/tag'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { cn } from '@/lib/utils'
import type { PeriodBlock, WeekColumn } from './week-grid'

/**
 * A week as the school teaches it — a column per day, the periods stacked
 * inside it in time order.
 *
 * A period shows the three things anyone scans for: which day, what time,
 * which subject. Everything else the school holds about it — how long it runs,
 * who takes it — is one hover away, so the grid stays readable at a glance and
 * still answers the second question without a page change. The hover opens on
 * keyboard focus too, and where the portal gives an `onOpen` the block is a
 * button, which is the same detail on a touch screen that has no hover.
 *
 * `mine` marks a teacher's own periods, and is undefined on the portals where
 * the question does not arise — a student's grid is all theirs.
 */
export function WeekCalendar({
  columns,
  onOpen,
}: {
  columns: WeekColumn[]
  /** Opens the period's full record, where the portal publishes one. */
  onOpen?: (period: PeriodBlock) => void
}) {
  return (
    <div className="flex flex-wrap overflow-hidden rounded-xl border border-divider bg-raised shadow-card">
      {columns.map((column, index) => (
        <div
          key={column.day}
          style={{ animationDelay: `${index * 40}ms` }}
          className="flex min-w-0 flex-[1_1_200px] animate-ems-up flex-col shadow-[inset_-1px_0_0_var(--ems-divider),inset_0_-1px_0_var(--ems-divider)]"
        >
          <DayHeading column={column} />

          <div className="flex flex-1 flex-col gap-2 p-2.5">
            {column.periods.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">No lessons</p>
            ) : (
              column.periods.map((period) => (
                <PeriodCard
                  key={period.id}
                  column={column}
                  period={period}
                  onOpen={onOpen}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** The day, and this week's date under it. Today's column wears the accent. */
function DayHeading({ column }: { column: WeekColumn }) {
  return (
    <div
      className={cn(
        'px-3 py-2.5 shadow-[inset_0_-1px_0_var(--ems-divider)]',
        column.today && 'bg-brand-100',
      )}
    >
      <div
        className={cn(
          'font-heading text-sm font-extrabold uppercase tracking-label',
          column.today ? 'text-brand-800' : 'text-foreground',
        )}
      >
        {column.day}
      </div>
      <div
        className={cn(
          'mt-0.5 text-2xs tabular-nums',
          column.today ? 'text-brand-700' : 'text-muted-foreground',
        )}
      >
        {column.today ? `${column.date} · today` : column.date}
      </div>
    </div>
  )
}

/**
 * Three looks, not two. A grid that never asks "whose is this?" keeps the
 * neutral block; where it does ask, the reader's own period is filled and
 * named, and everyone else's is stepped back so the two cannot be confused at
 * a glance across six classes.
 */
function blockLook(period: PeriodBlock): string {
  if (period.mine === undefined) return 'border-brand-500 bg-neutral-100 hover:bg-brand-100'
  return period.mine
    ? 'border-brand-600 bg-brand-100 hover:bg-brand-200'
    : 'border-neutral-300 bg-neutral-100/70 text-muted-foreground hover:bg-neutral-100'
}

function PeriodCard({
  column,
  period,
  onOpen,
}: {
  column: WeekColumn
  period: PeriodBlock
  onOpen?: (period: PeriodBlock) => void
}) {
  const look = cn(
    'block w-full rounded-r-md border-l-2 px-2.5 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-hidden',
    blockLook(period),
  )

  const inside = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-2xs tabular-nums',
            period.mine === false ? 'text-neutral-600' : 'text-brand-700',
          )}
        >
          {period.time}
        </span>
        {period.mine && (
          <Tag variant="accent" className="px-1.5 py-0 text-2xs tracking-label">
            YOURS
          </Tag>
        )}
      </div>
      <div
        className={cn(
          'mt-1 font-heading text-sm leading-tight font-extrabold',
          period.mine && 'text-brand-900',
        )}
      >
        {period.subject}
      </div>
    </>
  )

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {onOpen ? (
          <button type="button" onClick={() => onOpen(period)} className={look}>
            {inside}
          </button>
        ) : (
          <div className={look}>{inside}</div>
        )}
      </HoverCardTrigger>

      <HoverCardContent align="start">
        <div className="font-heading text-base leading-tight font-extrabold">
          {period.subject}
        </div>
        <div className="mt-1 text-2xs uppercase tracking-label text-brand-700">
          {column.date ? `${column.day} · ${column.date}` : column.day}
        </div>

        <dl className="mt-2.5 space-y-1.5 text-xs">
          <Detail icon={<Clock className="size-3.5" strokeWidth={1.8} />} label="Time">
            {period.length ? `${period.time} · ${period.length}` : period.time}
          </Detail>
          <Detail icon={<User className="size-3.5" strokeWidth={1.8} />} label="Teacher">
            {period.mine ? 'You take this period' : period.teacher}
          </Detail>
        </dl>
      </HoverCardContent>
    </HoverCard>
  )
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-neutral-600">{icon}</span>
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  )
}
