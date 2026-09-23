import { createFileRoute } from '@tanstack/react-router'
import { StudentsMessageForm } from '@/portals/teacher/features/messages/students-message-form'

export const Route = createFileRoute('/teacher/msg-students')({
  staticData: { title: 'Message my students', crumb: 'Messages' },
  component: StudentsMessageForm,
})
