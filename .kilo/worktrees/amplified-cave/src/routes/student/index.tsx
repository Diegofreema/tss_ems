import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { BarChart } from '@/components/charts/bar-chart'
import { ActivityList } from '@/components/common/activity-list'
import { FigureTiles } from '@/components/common/figure-tiles'
import { EmptyState } from '@/components/feedback/empty-state'
import { Panel } from '@/components/page/panel'
import { Button } from '@/components/ui/button'
import { NotificationsPanel } from '@/features/notifications/components/notifications-panel'
import { useMyNotifications } from '@/features/notifications/use-notice-feed'
import { useFirstName } from '@/features/auth/session'
import { freshen } from '@/db/collection'
import { schoolingInvoices, schoolingStats } from '@/db/collections/schooling'
import { useHeldDocument } from '@/db/live'
import { studentHome } from '@/portals/student/api/dashboard'

export const Route = createFileRoute('/student/')({
  staticData: { title: 'Dashboard', crumb: 'NETPRO EMS Bronze' },
  // Readied here rather than suspended on: the counters and the ledger arrive
  // together or not at all, and a refusal is swallowed so a student with no
  // connection lands on their own home page rather than an error boundary.
  //
  // And asked for again, not merely readied. This is the page a student lands
  // on every time they open the portal, and the five counters on it are the
  // school's own arithmetic about fees and marks — the figures most likely to
  // have moved since this device last synced, and the ones a stale copy of is
  // least forgivable. Both are read live, so the fresh answer redraws them
  // without the page waiting on it.
  loader: () => freshen([schoolingStats, schoolingInvoices]),
  component: StudentDashboard,
})

function StudentDashboard() {
  const name = useFirstName('there')
  const { doc: stats } = useHeldDocument(schoolingStats)
  const { doc: ledger } = useHeldDocument(schoolingInvoices)
  // Both stand in empty where the device holds nothing: the home page's job is
  // to say what the school holds, and "nothing yet" is an answer it already
  // knows how to draw.
  const home = studentHome(stats ?? ({} as never), ledger?.invoices ?? [])
  const notifications = useMyNotifications()

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-page-title">Hello, {name}.</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{home.note}</p>
        </div>
        <Button asChild size="lg">
          <Link to={home.action.to}>
            {home.action.label}
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        </Button>
      </div>

      <div className="mt-7">
        <FigureTiles figures={home.figures} />
      </div>

      <div className="mt-3.5 grid gap-3.5 @3xl/page:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-3.5">
          <Panel
            title="Your bills"
            description="What the school has raised for you, newest first."
          >
            {home.bills.length ? (
              <ActivityList entries={home.bills} />
            ) : (
              <EmptyState
                title="No bills yet"
                body="Fees the school raises for you are listed here, each with what it was for and when it was paid."
              />
            )}
          </Panel>

          <Panel
            title="Where it went"
            description="Each fee you have settled this session."
          >
            {home.fees.bars.length ? (
              <BarChart bars={home.fees.bars} peak={home.fees.peak} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing has been paid on your record yet.
              </p>
            )}
          </Panel>
        </div>

        <NotificationsPanel
          notifications={notifications}
          allPath="/student/notifications"
        />
      </div>
    </>
  )
}
