import { createFileRoute } from '@tanstack/react-router';
import { CollectionPage } from '@/portals/admin/components/collection-page';
import { timetable } from '@/portals/admin/collections/timetable';

export const Route = createFileRoute('/admin/timetable')({
  staticData: { title: 'Timetable', crumb: 'Academics' },
  component: () => <CollectionPage definition={timetable} />,
});
