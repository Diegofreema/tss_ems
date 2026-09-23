import { createFileRoute } from '@tanstack/react-router'
import { SessionExpiredScreen } from '@/features/auth/screens/session-expired'

export const Route = createFileRoute('/_auth/session-expired')({
  staticData: { title: 'Session' },
  component: SessionExpiredScreen,
})
