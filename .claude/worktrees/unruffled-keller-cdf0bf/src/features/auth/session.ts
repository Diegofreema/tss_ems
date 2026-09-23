import type { QueryClient } from '@tanstack/react-query'
import { meQueryOptions } from '@/api/auth/hooks'
import { authKeys } from '@/api/auth/keys'
import type { Account } from '@/api/auth/types'
import { ApiError } from '@/api/client'
import type { Admin, User } from '@/api/users/types'
import type { AccountSummary } from '@/lib/account'
import { endSession, useSessionStore } from '@/stores/session.store'
import { accountSummary } from './account-summary'
import { useAuthStore } from './auth.store'
import {
  accountOfRecord,
  isDisabled,
  isSuperAdmin,
  type Portal,
  portalFor,
  type Role,
  roleForAccount,
} from './role'

/** The signed-in account as the screens need it. All null while signed out. */
export type Session = {
  account: Account | null
  user: User | null
  role: Role | null
  portal: Portal | null
}

/**
 * Reads the stored account rather than the query, so a component has an
 * identity on the first render after a reload instead of a loading state.
 */
export function useSession(): Session {
  const account = useSessionStore((state) => state.account)
  const role = account ? roleForAccount(account) : null

  return {
    account,
    user: account?.user ?? null,
    role,
    portal: role ? portalFor(role) : null,
  }
}

/**
 * Asks the API who the token belongs to and stores the answer.
 *
 * `null` means the token was refused or the sign-in has been switched off, and
 * the session has been ended by the time it returns. Anything else — a network
 * failure, a 500 — is left to throw: not being able to check is not the same
 * as being signed out.
 *
 * The answer is checked against the account that signed in before it is
 * believed, because this API's `me` can name somebody else entirely —
 * `accountOfRecord` has the whole of it.
 */
export async function loadAccount(queryClient: QueryClient): Promise<Account | null> {
  const account = await queryClient
    .ensureQueryData(meQueryOptions())
    .catch((error: unknown) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null
      throw error
    })

  if (!account) {
    endSession(queryClient)
    return null
  }

  const believed = accountOfRecord(useSessionStore.getState().account, account)

  // The office can switch a sign-in off at any moment, including while the
  // person is holding a live token. Treated exactly like a refused one, so
  // every caller — both portal guards and the sign-in form — already handles
  // it. The flag is set after the session ends, because ending it resets the
  // store the flag lives in.
  if (isDisabled(believed)) {
    endSession(queryClient)
    useAuthStore.getState().markDisabled()
    return null
  }

  useSessionStore.getState().setAccount(believed)
  return believed
}

/**
 * Re-asks the API who the token belongs to. Used after the person edits their
 * own record, so the sidebar and the greeting stop showing the old name.
 */
export async function refreshAccount(queryClient: QueryClient) {
  // Dropped rather than invalidated: nothing subscribes to `me`, and
  // `ensureQueryData` hands back cached data however stale it is.
  queryClient.removeQueries({ queryKey: authKeys.me() })
  return loadAccount(queryClient)
}

/**
 * The signed-in account for the sidebar block, falling back to the portal's
 * own definition — which is only reached in the moment between signing out and
 * the redirect landing, since the guard will not render a shell without one.
 */
export function useAccountSummary(roleLabel: string): AccountSummary {
  const account = useSessionStore((state) => state.account)
  if (account) return accountSummary(account)
  // Nobody, deliberately. This shows in the blink before `/users/me` answers
  // and in the moment between signing out and the redirect landing — a name
  // written here would be read off the screen as a real record.
  return { name: 'Signed in', line: roleLabel, initials: '' }
}

/**
 * The name to greet the signed-in person by, falling back to the portal's own
 * wording — reached only in the moment between signing out and the redirect
 * landing, since the guard will not render a dashboard without a session.
 */
export function useFirstName(fallback: string): string {
  return useSessionStore((state) => state.account?.user.fname) || fallback
}

/**
 * The office record, when the account is an administrator. Narrows the four
 * possible profile shapes down to the one `profile_type` promises, which is
 * what anything reading `privileges` needs.
 */
export function adminProfile(account: Account | null): Admin | null {
  return account?.profile_type === 'admin' ? ((account.profile ?? null) as Admin | null) : null
}

/** What this administrator is allowed to reach, by name. Empty for anyone else. */
export function privilegeNames(account: Account | null): string[] {
  return (adminProfile(account)?.privileges ?? []).map((privilege) => privilege.name)
}

/**
 * Whether the person signed in may act on other administrators.
 *
 * Read from the store rather than through a hook, so the collection
 * definitions — plain objects, built before React runs — can ask it at the
 * moment a button is about to be drawn.
 */
export function superAdminSignedIn(): boolean {
  return isSuperAdmin(useSessionStore.getState().account)
}
