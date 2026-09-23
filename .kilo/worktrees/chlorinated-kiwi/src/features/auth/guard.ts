import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { getToken } from '@/api/token'
import { useSessionStore } from '@/stores/session.store'
import { useAuthStore } from './auth.store'
import { portalFor, type Role, roleForAccount } from './role'
import { loadAccount } from './session'

/**
 * Resolves the signed-in account or sends the visitor somewhere they can act:
 * no token at all means sign in, a refused token means the session ended, and
 * a sign-in the office has switched off goes back to the form — being turned
 * away is not an expiry, and the form is where the reason is shown.
 *
 * Offline it answers from the copy the session store kept, because asking the
 * school who you are is exactly what cannot be done in the classroom this app
 * is for. That copy is not an authority — it never was — and the ceiling on it
 * is the token's own twelve hours.
 */
async function requireAccount(queryClient: QueryClient) {
  // `getToken` drops a token that is past the expiry the school stamped on it,
  // so reaching this line at all means there is a live one. That is what puts
  // a ceiling on the offline path below, and it needed no new clock.
  if (getToken() === null) throw redirect({ to: '/sign-in' })

  const cached = useSessionStore.getState().account

  if (!navigator.onLine) {
    // Nobody has signed in on this device, so there is no identity to open a
    // portal on and nothing cached to open it over.
    if (!cached) throw redirect({ to: '/sign-in' })

    // Signed in, offline, inside the token's life: open on what we know. The
    // token is still checked by the school on every request that leaves here,
    // and every portal endpoint resolves its own caller, so this reaches only
    // what is already on this device.
    return cached
  }

  if (cached) {
    // Don't hold the portal shut behind a slow or flaky connection. The check
    // still runs; a refusal ends the session and the next navigation redirects.
    void loadAccount(queryClient).catch(() => undefined)
    return cached
  }

  // A shell route must never throw, and `loadAccount` throws for anything
  // that is not a plain refusal — a dead uplink the browser still calls
  // online, a captive portal, a 500. With no cached account there is no
  // identity to open a portal on, so the form is the only page that can move
  // things forward; the session itself may well be fine.
  const account = await loadAccount(queryClient).catch(() => {
    throw redirect({ to: '/sign-in' })
  })
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

  // Offline the token cannot be checked, so the cached account decides. Nobody
  // is served the form they cannot submit while their own portal is readable.
  // A check that could not be made at all — a dead uplink the browser still
  // calls online — falls back the same way: rendering the form to somebody
  // possibly signed in beats crashing the sign-in route itself.
  const account = navigator.onLine
    ? await loadAccount(queryClient).catch(() => useSessionStore.getState().account)
    : useSessionStore.getState().account

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
