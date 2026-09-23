import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChartColumn } from 'lucide-react';
import { ActivityList } from '@/components/common/activity-list';
import { SectionHeading } from '@/components/common/section-heading';
import { BarChart } from '@/components/charts/bar-chart';
import { Panel } from '@/components/page/panel';
import { TileStrip } from '@/components/page/tile-strip';
import { Button } from '@/components/ui/button';
import { useFirstName } from '@/features/auth/session';
import { adminDashboardQuery } from '@/portals/admin/api/dashboard';
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
      .ensureQueryData(adminDashboardQuery)
      .catch(() => undefined),
  component: AdminDashboard,
});

function AdminDashboard() {
  const name = useFirstName('there');
  const { data } = useSuspenseQuery(adminDashboardQuery);

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
        <Button asChild size="lg">
          <Link to="/admin/analytics">
            <ChartColumn className="size-4" strokeWidth={2} />
            Business intelligence
          </Link>
        </Button>
      </div>

      <SectionHeading className="mt-7 mb-3.5">Finance</SectionHeading>
      <FigureTiles figures={data.money} />

      <SectionHeading className="mt-7 mb-3.5">People</SectionHeading>
      <FigureTiles figures={data.people} />

      <SectionHeading className="mt-7 mb-3.5">School</SectionHeading>
      <TileStrip size="lg" tiles={data.school} />

      <div className="mt-3.5 grid gap-3.5 @3xl/page:grid-cols-[1.35fr_1fr]">
        <Panel
          title="Fee collections"
          description="Naira settled per month, the last six months."
        >
          <BarChart bars={data.collections.bars} peak={data.collections.peak} />
        </Panel>

        <Panel
          title="Latest activity"
          description="Everything is written to the audit log."
        >
          <ActivityList entries={data.activity} />
        </Panel>
      </div>
    </>
  );
}
