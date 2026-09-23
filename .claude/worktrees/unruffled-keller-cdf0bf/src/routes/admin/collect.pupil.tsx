import { createFileRoute } from '@tanstack/react-router'
import { PupilLookupPage } from '@/portals/admin/features/collect-pupil/pupil-page'

export const Route = createFileRoute('/admin/collect/pupil')({
  staticData: { title: 'Find a pupil', crumb: 'Finance · Fee collection', crumbTo: '/admin/collect' },
  component: PupilLookupPage,
})
