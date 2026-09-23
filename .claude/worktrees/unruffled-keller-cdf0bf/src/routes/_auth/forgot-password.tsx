import { createFileRoute } from '@tanstack/react-router'
import { ForgotPasswordScreen } from '@/features/auth/screens/forgot-password'

export const Route = createFileRoute('/_auth/forgot-password')({
  staticData: { title: 'Reset · step 1 of 3' },
  component: ForgotPasswordScreen,
})
