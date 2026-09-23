import { createFileRoute } from '@tanstack/react-router'
import { MessageSchoolForm } from '@/portals/parent/features/messages/message-school-form'

export const Route = createFileRoute('/parent/msg-school')({
  staticData: { title: 'Message the school', crumb: 'Messages' },
  component: MessageSchoolForm,
})
