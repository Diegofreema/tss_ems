import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { subjects } from '@/portals/admin/collections/academics'

export const Route = createFileRoute('/admin/subjects')({
  staticData: { title: 'Subjects', crumb: 'Academics' },
  component: () => <CollectionPage definition={subjects} />,
})
