import { createFileRoute } from '@tanstack/react-router';
import { CollectionPage } from '@/portals/student/components/collection-page';
import { courses } from '@/portals/student/collections/learning';

export const Route = createFileRoute('/student/courses')({
  staticData: { title: 'My subjects', crumb: 'Learning' },
  component: () => <CollectionPage definition={courses} />,
});
