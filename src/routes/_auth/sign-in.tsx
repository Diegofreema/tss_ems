import { createFileRoute } from '@tanstack/react-router'
import { redirectIfSignedIn } from '@/features/auth/guard'
import { SignInScreen } from '@/features/auth/screens/sign-in'

export const Route = createFileRoute('/_auth/sign-in')({
  beforeLoad: ({ context }) => redirectIfSignedIn(context.queryClient),
  staticData: { title: 'Step 1 of 1' },
  component: SignInScreen,
})
