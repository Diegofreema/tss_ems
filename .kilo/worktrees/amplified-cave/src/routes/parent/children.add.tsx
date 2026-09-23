import { createFileRoute } from '@tanstack/react-router'
import { AddChildForm } from '@/portals/parent/features/children/add-child-form'

export const Route = createFileRoute('/parent/children/add')({
  staticData: { title: 'Add a child', crumb: 'My children', crumbTo: '/parent/children' },
  component: AddChildForm,
})
