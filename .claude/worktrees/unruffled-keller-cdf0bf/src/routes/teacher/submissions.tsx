import { createFileRoute } from '@tanstack/react-router'
import { SubmissionsPage } from '@/portals/teacher/features/assignments/submissions-page'

export const Route = createFileRoute('/teacher/submissions')({
  staticData: {
    title: 'Marking',
    crumb: 'Assessment · Set assignments',
    crumbTo: '/teacher/assignments',
  },
  component: SubmissionsPage,
})
