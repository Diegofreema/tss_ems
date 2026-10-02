import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChartColumn } from 'lucide-react';
import { ActivityList } from '@/components/common/activity-list';
import { SectionHeading } from '@/components/common/section-heading';
import { BarChart } from '@/components/charts/bar-chart';
import { Panel } from '@/components/page/panel';
import { TileStrip } from '@/components/page/tile-strip';
import { Button } from '@/components/ui/button';
import { currentAccess, useAccess } from '@/features/auth/access';
import { type Access, holds, mayOpen } from '@/features/auth/privileges';
import { useFirstName } from '@/features/auth/session';
import {
  adminDashboardQuery,
  type DashboardScope,
} from '@/portals/admin/api/dashboard';
import { greeting } from '@/lib/greeting';
import { FigureTiles } from '@/components/common/figure-tiles';

export const Route = createFileRoute('/admin/')({
  staticData: { title: 'Dashboard', crumb: 'TSS EMS Bronze' },
  // Started and swallowed: a loader that awaited a paused query used to hang
  // the dashboard on its shimmer for as long as the device was offline. The
  // component's `useSuspenseQuery` reads the same key and throws the honest
  // failure to `RouteError`, which offers a retry.
  loader: ({ context }) =>
    context.queryClient
      .ensureQueryData(adminDashboardQuery(scopeOf(currentAccess())))
      .catch(() => undefined),
  component: AdminDashboard,
});

/**
 * The home page is every section at a glance, so it is cut down by section
 * like the rail: the money is Fees and Payments', the audit feed is Admin's, and a
 * figure is drawn only where the page it opens onto is one this account may
 * open — a count of applicants is the Admission section's to know.
 */
const scopeOf = (access: Access): DashboardScope => ({
  money: holds(access, 'fees'),
  activity: holds(access, 'admin'),
});

function AdminDashboard() {
  const name = useFirstName('there');
  const access = useAccess();
  const scope = scopeOf(access);
  const { data } = useSuspenseQuery(adminDashboardQuery(scope));
  const opens = (tile: { to?: string }) => !tile.to || mayOpen(access, tile.to);
  const people = data.people.filter(opens);
  // Hostels opens no page here, so it is asked of its section directly.
  const school = data.school.filter((tile) =>
    tile.to ? opens(tile) : holds(access, 'hostels'),
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-page-title">
            {greeting(new Date())}, {name}.
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {scope.money
              ? 'Money and people as the register holds them. Figures update as payments clear.'
              : 'The parts of the school your account looks after, as the register holds them.'}
          </p>
        </div>
        {mayOpen(access, '/admin/analytics') && (
          <Button asChild size="lg">
            <Link to="/admin/analytics">
              <ChartColumn className="size-4" strokeWidth={2} />
              Business intelligence
            </Link>
          </Button>
        )}
      </div>

      {scope.money && (
        <>
          <SectionHeading className="mt-7 mb-3.5">Finance</SectionHeading>
          <FigureTiles figures={data.money} />
        </>
      )}

      {people.length > 0 && (
        <>
          <SectionHeading className="mt-7 mb-3.5">People</SectionHeading>
          <FigureTiles figures={people} />
        </>
      )}

      {school.length > 0 && (
        <>
          <SectionHeading className="mt-7 mb-3.5">School</SectionHeading>
          <TileStrip size="lg" tiles={school} />
        </>
      )}

      {(scope.money || scope.activity) && (
        <div
          className={
            scope.money && scope.activity
              ? 'mt-3.5 grid gap-3.5 @3xl/page:grid-cols-[1.35fr_1fr]'
              : 'mt-3.5 grid gap-3.5'
          }
        >
          {scope.money && (
            <Panel
              title="Fee collections"
              description="Naira settled per month, the last six months."
            >
              <BarChart
                bars={data.collections.bars}
                peak={data.collections.peak}
              />
            </Panel>
          )}

          {scope.activity && (
            <Panel
              title="Latest activity"
              description="Everything is written to the audit log."
            >
              <ActivityList entries={data.activity} />
            </Panel>
          )}
        </div>
      )}
    </>
  );
}
