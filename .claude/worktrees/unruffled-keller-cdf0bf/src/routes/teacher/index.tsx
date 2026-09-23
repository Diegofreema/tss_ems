import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PenLine } from 'lucide-react';
import { ActivityList } from '@/components/common/activity-list';
import { EmptyState } from '@/components/feedback/empty-state';
import { FigureTiles } from '@/components/common/figure-tiles';
import { Rule } from '@/components/page/rule';
import { Button } from '@/components/ui/button';
import { DetailRows } from '@/features/auth/components/detail-rows';
import { useFirstName } from '@/features/auth/session';
import { greeting } from '@/lib/greeting';
import { teacherDashboardQuery } from '@/portals/teacher/api/dashboard';

export const Route = createFileRoute('/teacher/')({
  staticData: { title: 'Dashboard', crumb: 'NETPRO EMS Bronze' },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(teacherDashboardQuery),
  component: TeacherDashboard,
});

function TeacherDashboard() {
  const name = useFirstName('there');
  const { data } = useSuspenseQuery(teacherDashboardQuery);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-page-title">
            {greeting(new Date())}, {name}.
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{data.note}</p>
        </div>
        <Button asChild>
          <Link to="/teacher/scores">
            <PenLine className="size-3.75" strokeWidth={2} />
            Enter scores
          </Link>
        </Button>
      </div>
      <Rule />

      <FigureTiles figures={data.figures} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h4 className="mb-0.5 text-xl">Assignments you have set</h4>
          <p className="text-[12.5px] text-muted-foreground">
            The most recent first, with the ones still open flagged.
          </p>
          {data.assignments.length ? (
            <ActivityList entries={data.assignments} />
          ) : (
            <div className="mt-3.5">
              <EmptyState
                title="No assignments yet"
                body="Assignments you set for your classes are listed here, with when they close."
                action={
                  <Button asChild>
                    <Link to="/teacher/assignments">Set an assignment</Link>
                  </Button>
                }
              />
            </div>
          )}
        </section>

        <section>
          <h4 className="mb-0.5 text-xl">Class you take</h4>
          <p className="text-[12.5px] text-muted-foreground">
            The classes the office has put you in front of.
          </p>
          {data.arms.length ? (
            <DetailRows rows={data.arms} />
          ) : (
            <p className="mt-3.5 border-t-2 border-divider py-3 text-[13px] text-muted-foreground">
              You are not class teacher this session.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
