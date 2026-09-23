import { createFileRoute } from '@tanstack/react-router';
import { CollectionPage } from '@/portals/student/components/collection-page';
import { assignments } from '@/portals/student/collections/assessment';

export const Route = createFileRoute('/student/assignments/')({
  staticData: { title: 'Assignments', crumb: 'Assessment' },
  component: () => <CollectionPage definition={assignments} />,
});
