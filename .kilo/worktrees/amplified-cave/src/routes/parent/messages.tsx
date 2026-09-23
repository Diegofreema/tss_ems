import { createFileRoute } from '@tanstack/react-router'
import { ParentMessagesPage } from '@/portals/parent/features/messages/parent-messages-page'

export const Route = createFileRoute('/parent/messages')({
  staticData: { title: 'Messages', crumb: 'Messages' },
  component: ParentMessagesPage,
})
