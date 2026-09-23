import { createFileRoute } from '@tanstack/react-router';
import { freshenRegister } from '@/features/collections/freshen';
import { CollectionPage } from '@/portals/student/components/collection-page';
import { courses } from '@/portals/student/collections/learning';
import { schoolingContent } from '@/db/collections/schooling';

export const Route = createFileRoute('/student/courses')({
  staticData: { title: 'My subjects', crumb: 'Learning' },
  // Opened, and asked for again: the set is on the device and stays
  // readable with no connection, but a page that never asks shows what
  // the school said whenever this device last happened to sync.
  // `schoolingContent` beside it because a subject's page is opened from here
  // and its Topics tab reads that set, not this register's — asked for on the
  // same visit rather than on whenever this device last happened to sync.
  loader: () => freshenRegister(courses, schoolingContent),
  component: () => <CollectionPage definition={courses} />,
});
