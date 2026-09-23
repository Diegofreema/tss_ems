import { createFileRoute } from '@tanstack/react-router'
import { requireRecovery } from '@/features/auth/guard'
import { CheckEmailScreen } from '@/features/auth/screens/check-email'

export const Route = createFileRoute('/_auth/check-email')({
  beforeLoad: () => requireRecovery('code'),
  staticData: { title: 'Reset · step 2 of 3' },
  component: CheckEmailScreen,
})
