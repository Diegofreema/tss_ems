import { createFileRoute } from '@tanstack/react-router';
import {
  studentAssignmentResultQuery,
  studentAssignmentQuery,
} from '@/portals/student/api/queries';
import { AssignmentResultPage } from '@/portals/student/features/assignments/assignment-result';

export const Route = createFileRoute('/student/assignments/$assignmentId/result')({
  staticData: {
    title: 'How you did',
    crumb: 'Assessment · Assignments',
    crumbTo: '/student/assignments',
  },
  /*
   * Both hops, warmed here. The URL names the assignment and the result endpoint is
   * keyed on the submission, so the assignment has to answer before the result can
   * be asked for at all — doing that in the loader keeps the page from
   * rendering twice on its way in.
   *
   * An assignment that was never sat has no submission, and that is not an error:
   * the page says so itself.
   */
  loader: async ({ context, params }) => {
    // Swallowed on failure — the page's own suspense retries and throws the
    // honest error to `RouteError`; awaiting a paused query here used to hang
    // the route on its shimmer for as long as the device was offline.
    try {
      const assignment = await context.queryClient.ensureQueryData(
        studentAssignmentQuery(params.assignmentId),
      );
      if (assignment.my_submission) {
        await context.queryClient.ensureQueryData(
          studentAssignmentResultQuery(String(assignment.my_submission.id)),
        );
      }
    } catch {
      // See above.
    }
  },
  component: Result,
});

function Result() {
  return <AssignmentResultPage assignmentId={Route.useParams().assignmentId} />;
}
