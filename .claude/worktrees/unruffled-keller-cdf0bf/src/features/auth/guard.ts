import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { getToken } from '@/api/token'
import { useAuthStore } from './auth.store'
import { portalFor, type Role, roleForAccount } from './role'
import { loadAccount } from './session'

/**
 * Resolves the signed-in account or sends the visitor somewhere they can act:
 * no token at all means sign in, a refused token means the session ended, and
 * a sign-in the office has switched off goes back to the form — being turned
 * away is not an expiry, and the form is where the reason is shown.
 */
async function requireAccount(queryClient: QueryClient) {
  if (getToken() === null) throw redirect({ to: '/sign-in' })

  const account = await loadAccount(queryClient)
  if (!account) {
    throw redirect({ to: useAuthStore.getState().disabled ? '/sign-in' : '/session-expired' })
  }
  return account
}

/**
 * Guards a portal's shell. Resolving the account here rather than inside the
 * shell means a wrong account never sees a frame of a portal it cannot use.
 */
export async function requirePortal(queryClient: QueryClient, role: Role) {
  const account = await requireAccount(queryClient)
  if (roleForAccount(account) !== role) throw redirect({ to: '/wrong-portal' })
}

/**
 * Guards the screens that only make sense to someone signed in — chiefly the
 * wrong-portal page, which is an answer to a question nobody signed out has
 * asked.
 */
export async function requireSession(queryClient: QueryClient) {
  await requireAccount(queryClient)
}

/**
 * The reverse: someone already signed in has no business on the sign-in form,
 * so they go to their own portal. A token that turns out to be dead is dropped
 * on the way and the form renders, rather than bouncing them around.
 */
export async function redirectIfSignedIn(queryClient: QueryClient) {
  if (getToken() === null) return

  const account = await loadAccount(queryClient)
  const role = account ? roleForAccount(account) : null
  if (role) throw redirect({ to: portalFor(role).to })
}

/**
 * Keeps the three reset screens in order. Neither of the last two can do
 * anything without the id step 1 returned, and the last also needs the ticket
 * step 2 traded the code for.
 */
export function requireRecovery(step: 'code' | 'password') {
  const { userId, ticket } = useAuthStore.getState()
  if (userId === null) throw redirect({ to: '/forgot-password' })
  if (step === 'password' && ticket === null) throw redirect({ to: '/check-email' })
}
