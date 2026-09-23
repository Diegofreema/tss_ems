import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { BarChart } from '@/components/charts/bar-chart'
import { ActivityList } from '@/components/common/activity-list'
import { FigureTiles } from '@/components/common/figure-tiles'
import { EmptyState } from '@/components/feedback/empty-state'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { useFirstName } from '@/features/auth/session'
import { studentHome } from '@/portals/student/api/dashboard'
import {
  studentInvoicesQuery,
  studentStatsQuery,
} from '@/portals/student/api/queries'

export const Route = createFileRoute('/student/')({
  staticData: { title: 'Dashboard', crumb: 'NETPRO EMS Bronze' },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(studentStatsQuery),
      context.queryClient.ensureQueryData(studentInvoicesQuery),
    ]),
  component: StudentDashboard,
})

function StudentDashboard() {
  const name = useFirstName('there')
  const { data: stats } = useSuspenseQuery(studentStatsQuery)
  const { data: ledger } = useSuspenseQuery(studentInvoicesQuery)
  const home = studentHome(stats, ledger.invoices)

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-page-title">Hello, {name}.</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{home.note}</p>
        </div>
        <Button asChild>
          <Link to={home.action.to}>
            {home.action.label}
            <ArrowRight className="size-[15px]" strokeWidth={2} />
          </Link>
        </Button>
      </div>
      <Rule />

      <FigureTiles figures={home.figures} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h4 className="mb-0.5 text-xl">Your bills</h4>
          <p className="text-[12.5px] text-muted-foreground">
            What the school has raised for you, newest first.
          </p>
          {home.bills.length ? (
            <ActivityList entries={home.bills} />
          ) : (
            <div className="mt-3.5">
              <EmptyState
                title="No bills yet"
                body="Fees the school raises for you are listed here, each with what it was for and when it was paid."
              />
            </div>
          )}
        </section>

        <section>
          <h4 className="mb-0.5 text-xl">Where it went</h4>
          <p className="text-[12.5px] text-muted-foreground">
            Each fee you have settled this session.
          </p>
          {home.fees.bars.length ? (
            <BarChart bars={home.fees.bars} peak={home.fees.peak} />
          ) : (
            <p className="mt-3.5 border-t-2 border-divider py-3 text-[13px] text-muted-foreground">
              Nothing has been paid on your record yet.
            </p>
          )}
        </section>
      </div>
    </>
  )
}
