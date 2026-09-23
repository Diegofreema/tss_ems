import { createFileRoute } from '@tanstack/react-router'
import { ResetPasswordScreen } from '@/features/auth/screens/reset-password'

export const Route = createFileRoute('/_auth/first-sign-in')({
  staticData: { title: 'First sign in' },
  component: () => <ResetPasswordScreen first />,
})
