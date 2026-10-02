import { createFileRoute } from '@tanstack/react-router';
import { QuizResult } from '@/portals/student/features/quizzes/quiz-result';

export const Route = createFileRoute('/student/quizzes/$quizId/result')({
  staticData: {
    title: 'Quiz result',
    crumb: 'Assessment · Quizzes',
    crumbTo: '/student/quizzes',
  },
  component: Result,
});

function Result() {
  return <QuizResult quizId={Route.useParams().quizId} />;
}
