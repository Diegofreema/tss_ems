import { createFileRoute } from '@tanstack/react-router'
import { AdminMessagesPage } from '@/portals/admin/features/messages/admin-messages-page'

export const Route = createFileRoute('/admin/messages')({
  staticData: { title: 'Messages', crumb: 'School' },
  component: AdminMessagesPage,
})
