import { createFileRoute } from '@tanstack/react-router';
import { QuizSitting } from '@/portals/student/features/quizzes/quiz-sitting';

export const Route = createFileRoute('/student/quizzes/$quizId/')({
  staticData: {
    title: 'Sit a quiz',
    crumb: 'Assessment · Quizzes',
    crumbTo: '/student/quizzes',
  },
  component: Quiz,
});

function Quiz() {
  return <QuizSitting quizId={Route.useParams().quizId} />;
}
