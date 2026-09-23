import { createFileRoute } from '@tanstack/react-router'
import { requireRecovery } from '@/features/auth/guard'
import { ResetPasswordScreen } from '@/features/auth/screens/reset-password'

export const Route = createFileRoute('/_auth/reset-password')({
  beforeLoad: () => requireRecovery('password'),
  staticData: { title: 'Reset · step 3 of 3' },
  component: () => <ResetPasswordScreen first={false} />,
})
