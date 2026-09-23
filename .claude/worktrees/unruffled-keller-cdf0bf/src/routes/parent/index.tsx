import { createFileRoute, Link } from '@tanstack/react-router'
import { CreditCard } from 'lucide-react'
import { BarChart } from '@/components/charts/bar-chart'
import { FigureTiles } from '@/components/common/figure-tiles'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
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
  component: ParentDashboard,
})

function ParentDashboard() {
  const name = useFirstName('there')
  const family = useFamily()
  const child = useSelectedChild()
  const queue = queueFor(family)
  const attendance = attendanceBarsFor(child)

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
        <Button asChild disabled={!queue.total}>
          <Link to="/parent/pay">
            <CreditCard className="size-[15px]" strokeWidth={2} />
            Pay fees
          </Link>
        </Button>
      </div>
      <Rule />

      {/* Keyed on the child so the figures count up again on a switch. */}
      <FigureTiles key={child.id} figures={figuresFor(child, family)} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h4 className="mb-0.5 text-xl">What needs you</h4>
          <p className="text-[12.5px] text-muted-foreground">
            Every invoice still owing, largest first.
          </p>
          <ActionQueue items={queue.items} empty="Nothing is owed on any child right now." />
        </section>

        <section>
          <h4 className="mb-0.5 text-xl">Attendance, last 6 weeks</h4>
          <p className="text-[12.5px] text-muted-foreground">
            {child.full}, days present out of days marked.
          </p>
          <BarChart key={child.id} bars={attendance.bars} peak={attendance.peak} />
        </section>
      </div>
    </>
  )
}
