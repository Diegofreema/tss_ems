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
    const assignment = await context.queryClient.ensureQueryData(
      studentAssignmentQuery(params.assignmentId),
    );
    if (assignment.my_submission) {
      await context.queryClient.ensureQueryData(
        studentAssignmentResultQuery(String(assignment.my_submission.id)),
      );
    }
  },
  component: Result,
});

function Result() {
  return <AssignmentResultPage assignmentId={Route.useParams().assignmentId} />;
}
