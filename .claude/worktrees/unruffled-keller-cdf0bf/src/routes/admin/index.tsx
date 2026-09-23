import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChartColumn } from 'lucide-react'
import { ActivityList } from '@/components/common/activity-list'
import { SectionHeading } from '@/components/common/section-heading'
import { BarChart } from '@/components/charts/bar-chart'
import { Rule } from '@/components/page/rule'
import { TileStrip } from '@/components/page/tile-strip'
import { Button } from '@/components/ui/button'
import { useFirstName } from '@/features/auth/session'
import { adminDashboardQuery } from '@/portals/admin/api/dashboard'
import { greeting } from '@/lib/greeting'
import { FigureTiles } from '@/components/common/figure-tiles'

export const Route = createFileRoute('/admin/')({
  staticData: { title: 'Dashboard', crumb: 'NETPRO EMS Bronze' },
  loader: ({ context }) => context.queryClient.ensureQueryData(adminDashboardQuery),
  component: AdminDashboard,
})

function AdminDashboard() {
  const name = useFirstName('there')
  const { data } = useSuspenseQuery(adminDashboardQuery)

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-page-title">
            {greeting(new Date())}, {name}.
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Money and people as the register holds them. Figures update as
            payments clear.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/analytics">
            <ChartColumn className="size-[15px]" strokeWidth={2} />
            Business intelligence
          </Link>
        </Button>
      </div>
      <Rule />

      <SectionHeading className="mb-3">Finance</SectionHeading>
      <FigureTiles figures={data.money} />

      <SectionHeading className="mt-7 mb-3">People</SectionHeading>
      <FigureTiles figures={data.people} />

      <SectionHeading className="mt-7 mb-3">School</SectionHeading>
      <TileStrip tiles={data.school} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <section>
          <h4 className="mb-0.5 text-xl">Fee collections</h4>
          <p className="text-[12.5px] text-muted-foreground">
            Naira settled per month, the last six months.
          </p>
          <BarChart bars={data.collections.bars} peak={data.collections.peak} />
        </section>

        <section>
          <h4 className="mb-0.5 text-xl">Latest activity</h4>
          <p className="text-[12.5px] text-muted-foreground">
            Everything is written to the audit log.
          </p>
          <ActivityList entries={data.activity} />
        </section>
      </div>
    </>
  )
}
