import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/features/auth/guard'
import { WrongPortalScreen } from '@/features/auth/screens/wrong-portal'

export const Route = createFileRoute('/_auth/wrong-portal')({
  beforeLoad: ({ context }) => requireSession(context.queryClient),
  staticData: { title: 'Access' },
  component: WrongPortalScreen,
})
