import { createFileRoute } from '@tanstack/react-router'
import { SignedInScreen } from '@/features/auth/screens/signed-in'

export const Route = createFileRoute('/_auth/signed-in')({
  staticData: { title: 'Signed in' },
  component: SignedInScreen,
})
