import { createFileRoute } from '@tanstack/react-router';
import { studentAssignmentQuery } from '@/portals/student/api/queries';
import { AssignmentPage } from '@/portals/student/features/assignments/assignment-page';

export const Route = createFileRoute('/student/assignments/$assignmentId/')({
  staticData: {
    title: 'Take an assignment',
    crumb: 'Assessment · Assignments',
    crumbTo: '/student/assignments',
  },
  // Fetched here so the page never suspends into an empty shell: a student about
  // to sit an assignment should see the assignment, not a flash of nothing.
  // Swallowed on failure — the page's own suspense retries and throws the
  // honest error to `RouteError`; a loader that awaited a paused query used to
  // hang the route on its shimmer for as long as the device was offline.
  loader: ({ context, params }) =>
    context.queryClient
      .ensureQueryData(studentAssignmentQuery(params.assignmentId))
      .catch(() => undefined),
  component: Assignment,
});

function Assignment() {
  return <AssignmentPage assignmentId={Route.useParams().assignmentId} />;
}
