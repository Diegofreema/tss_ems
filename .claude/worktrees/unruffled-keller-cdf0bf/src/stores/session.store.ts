import type { QueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Account } from '@/api/auth/types'
import { setToken } from '@/api/token'
import { useAuthStore } from '@/features/auth/auth.store'
import { useNotificationsStore } from '@/features/notifications/notifications.store'

type SessionState = {
  /** Exactly what `/users/me` last answered, or null while signed out. */
  account: Account | null
  setAccount: (account: Account) => void
  clear: () => void
}

/**
 * The signed-in account, kept in the browser so a reload has an identity
 * before `/users/me` has answered again.
 *
 * It is a copy, never an authority: the API decides what an account may do,
 * and the portal guard refetches on every entry and clears this the moment a
 * token is refused. Editing it by hand buys a shell with no data in it.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      account: null,
      setAccount: (account) => set({ account }),
      clear: () => set({ account: null }),
    }),
    { name: 'netpro.session' },
  ),
)

/**
 * Ends the session on this device — token, cached queries and every store that
 * holds something about the person, so no half-signed-out state is left for
 * whoever signs in next.
 *
 * `clear()` rather than an invalidation: an invalidated query keeps its data
 * and refetches, which would leave the previous account's answers on screen
 * until the next request came back — and with the token gone, it never would.
 *
 * Deliberately left alone: the theme and motion settings, and the sidebar's
 * drawer and collapsed groups. Those belong to the device, not the account,
 * and resetting them would punish the person for signing out. So is the
 * parent portal's chosen child — it is looked up in the household that is
 * fetched, so an id from somebody else's family simply is not found and the
 * switcher falls back to the first child on the record.
 */
export function endSession(queryClient: QueryClient) {
  setToken(null)
  queryClient.clear()
  useSessionStore.getState().clear()
  useNotificationsStore.getState().clear()
  useAuthStore.getState().reset()
}
