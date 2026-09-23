import { createFileRoute } from '@tanstack/react-router'
import { AdminMessageForm } from '@/portals/teacher/features/messages/admin-message-form'

export const Route = createFileRoute('/teacher/msg-admin')({
  staticData: { title: 'Message the admin', crumb: 'Messages' },
  component: AdminMessageForm,
})
