import { createFileRoute } from '@tanstack/react-router';
import { freshenRegister } from '@/features/collections/freshen';
import { CollectionPage } from '@/portals/student/components/collection-page';
import { assignments } from '@/portals/student/collections/assessment';

export const Route = createFileRoute('/student/assignments/')({
  staticData: { title: 'Assignments', crumb: 'Assessment' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  loader: () => freshenRegister(assignments),
  component: () => <CollectionPage definition={assignments} />,
});
