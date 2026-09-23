import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PenLine } from 'lucide-react';
import { ActivityList } from '@/components/common/activity-list';
import { EmptyState } from '@/components/feedback/empty-state';
import { FigureTiles } from '@/components/common/figure-tiles';
import { Panel } from '@/components/page/panel';
import { Button } from '@/components/ui/button';
import { DetailRows } from '@/features/auth/components/detail-rows';
import { useMyNotifications } from '@/features/notifications/use-notice-feed';
import { NotificationsPanel } from '@/features/notifications/components/notifications-panel';
import { useFirstName } from '@/features/auth/session';
import { greeting } from '@/lib/greeting';
import { teacherDashboardQuery } from '@/portals/teacher/api/dashboard';

export const Route = createFileRoute('/teacher/')({
  staticData: { title: 'Dashboard', crumb: 'TSS EMS Bronze' },
  // Started and swallowed: a loader that awaited a paused query used to hang
  // the dashboard on its shimmer for as long as the device was offline. The
  // component's `useSuspenseQuery` reads the same key and throws the honest
  // failure to `RouteError`, which offers a retry.
  loader: ({ context }) =>
    context.queryClient
      .ensureQueryData(teacherDashboardQuery)
      .catch(() => undefined),
  component: TeacherDashboard,
});

function TeacherDashboard() {
  const name = useFirstName('there');
  const { data } = useSuspenseQuery(teacherDashboardQuery);
  const notifications = useMyNotifications();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-page-title">
            {greeting(new Date())}, {name}.
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{data.note}</p>
        </div>
        <Button asChild size="lg">
          <Link to="/teacher/scores">
            <PenLine className="size-4" strokeWidth={2} />
            Enter scores
          </Link>
        </Button>
      </div>

      <div className="mt-7">
        <FigureTiles figures={data.figures} />
      </div>

      <div className="mt-3.5 grid gap-3.5 @3xl/page:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Assignments you have set"
          description="The most recent first, with the ones still open flagged."
        >
          {data.assignments.length ? (
            <ActivityList entries={data.assignments} />
          ) : (
            <EmptyState
              title="No assignments yet"
              body="Assignments you set for your classes are listed here, with when they close."
              action={
                <Button asChild>
                  <Link to="/teacher/assignments">Set an assignment</Link>
                </Button>
              }
            />
          )}
        </Panel>

        <div className="grid content-start gap-3.5">
          <NotificationsPanel
            notifications={notifications}
            allPath="/teacher/notifications"
          />

          <Panel
            title="Class you take"
            description="The classes the office has put you in front of."
          >
            {data.arms.length ? (
              <DetailRows rows={data.arms} />
            ) : (
              <p className="text-sm text-muted-foreground">
                You are not class teacher this session.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
