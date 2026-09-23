import { createFileRoute, Link } from '@tanstack/react-router'
import { CreditCard } from 'lucide-react'
import { BarChart } from '@/components/charts/bar-chart'
import { FigureTiles } from '@/components/common/figure-tiles'
import { Panel } from '@/components/page/panel'
import { Button } from '@/components/ui/button'
import { NotificationsPanel } from '@/features/notifications/components/notifications-panel'
import { useMyNotifications } from '@/features/notifications/use-notice-feed'
import { freshen } from '@/db/collection'
import {
  parentAttendance,
  parentChildren,
  parentInvoices,
} from '@/db/collections/parent'
import { useFirstName } from '@/features/auth/session'
import { greeting } from '@/lib/greeting'
import { ActionQueue } from '@/portals/parent/features/action-queue'
import {
  attendanceBarsFor,
  figuresFor,
  queueFor,
} from '@/portals/parent/features/dashboard/dashboard'
import { useFamily, useSelectedChild } from '@/portals/parent/parent.store'

export const Route = createFileRoute('/parent/')({
  staticData: { title: 'Dashboard', crumb: 'Overview' },
  // The whole household, asked for again on the way in — this page counts what
  // is owed across every child and draws six weeks of one child's register, so
  // all three sets are on screen at once. Only the readying is waited for; the
  // figures are composed from live queries and follow the answer in.
  loader: () => freshen([parentChildren, parentInvoices, parentAttendance]),
  component: ParentDashboard,
})

function ParentDashboard() {
  const name = useFirstName('there')
  const family = useFamily()
  const child = useSelectedChild()
  const queue = queueFor(family)
  const attendance = attendanceBarsFor(child)
  const notifications = useMyNotifications()

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-page-title">
            {greeting(new Date())}, {name}.
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {queue.total
              ? `${queue.total === 1 ? 'One invoice is' : `${queue.total} invoices are`} outstanding across your family.`
              : 'Nothing is outstanding across your family.'}
          </p>
        </div>
        <Button asChild disabled={!queue.total} size="lg">
          <Link to="/parent/pay">
            <CreditCard className="size-4" strokeWidth={2} />
            Pay fees
          </Link>
        </Button>
      </div>

      {/* Keyed on the child so the figures count up again on a switch. */}
      <div className="mt-7">
        <FigureTiles key={child.id} figures={figuresFor(child, family)} />
      </div>

      <div className="mt-3.5 grid gap-3.5 @3xl/page:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-3.5">
          <Panel
            title="Attendance, last 6 weeks"
            description={`${child.full}, days present out of days marked.`}
          >
            <BarChart key={child.id} bars={attendance.bars} peak={attendance.peak} />
          </Panel>

          <Panel
            title="What needs you"
            description="Every invoice still owing, largest first."
          >
            <ActionQueue
              items={queue.items}
              empty="Nothing is owed on any child right now."
            />
          </Panel>
        </div>

        <NotificationsPanel
          notifications={notifications}
          allPath="/parent/notifications"
        />
      </div>
    </>
  )
}
