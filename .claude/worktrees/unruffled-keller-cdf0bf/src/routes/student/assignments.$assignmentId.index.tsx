import { createFileRoute } from '@tanstack/react-router';
import { studentAssignmentQuery } from '@/portals/student/api/queries';
import { AssignmentPage } from '@/portals/student/features/assignments/assignment-page';

export const Route = createFileRoute('/student/assignments/$assignmentId/')({
  staticData: {
    title: 'Take an assignment',
    crumb: 'Assessment · Assignments',
    crumbTo: '/student/assignments',
  },
  // Fetched here so the page never suspends into an empty shell: a pupil about
  // to sit an assignment should see the assignment, not a flash of nothing.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(studentAssignmentQuery(params.assignmentId)),
  component: Assignment,
});

function Assignment() {
  return <AssignmentPage assignmentId={Route.useParams().assignmentId} />;
}
