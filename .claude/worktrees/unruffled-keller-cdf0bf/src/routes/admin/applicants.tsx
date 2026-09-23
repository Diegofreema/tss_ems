import { createFileRoute } from '@tanstack/react-router'
import { CollectionPage } from '@/portals/admin/components/collection-page'
import { applicants } from '@/portals/admin/collections/students'

export const Route = createFileRoute('/admin/applicants')({
  staticData: { title: 'Applicants', crumb: 'Students' },
  component: () => <CollectionPage definition={applicants} />,
})
