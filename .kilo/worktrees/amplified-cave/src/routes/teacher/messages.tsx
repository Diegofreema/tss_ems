import { createFileRoute } from '@tanstack/react-router'
import { TeacherMessagesPage } from '@/portals/teacher/features/messages/teacher-messages-page'

export const Route = createFileRoute('/teacher/messages')({
  staticData: { title: 'Messages', crumb: 'Messages' },
  component: TeacherMessagesPage,
})
