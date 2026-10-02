import { createFileRoute } from '@tanstack/react-router';
import { freshenRegister } from '@/features/collections/freshen';
import { CollectionPage } from '@/portals/student/components/collection-page';
import { quizzes } from '@/portals/student/collections/assessment';

export const Route = createFileRoute('/student/quizzes/')({
  staticData: { title: 'Quizzes', crumb: 'Assessment' },
  // Asked for again on the way in: a quiz a teacher opened this morning is
  // the reason anybody looks.
  loader: () => freshenRegister(quizzes),
  component: () => <CollectionPage definition={quizzes} />,
});
