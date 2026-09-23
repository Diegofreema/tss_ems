import { announceSignOut } from '@/db/tabs'
import type { QueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Account } from '@/api/auth/types'
import { everyStore, setToken, tokenStore } from '@/api/token'
import { useAuthStore } from '@/features/auth/auth.store'
import { wipeLocalDb } from '@/db/wipe'
import { useNotificationsStore } from '@/features/notifications/notifications.store'

type SessionState = {
  /** Exactly what `/users/me` last answered, or null while signed out. */
  account: Account | null
  setAccount: (account: Account) => void
  clear: () => void
}

/**
 * The identity is kept **wherever the token is kept**, and never anywhere else.
 *
 * It used to be `localStorage` whatever the token did. A sign-in with
 * "remember this device" unticked leaves its token in `sessionStorage`, which
 * is the tab's alone — so on a shared staff-room laptop two tabs signed in as
 * two people had a token each and one identity between them, the last to sign
 * in. Reload the other tab and it hydrated somebody else's identity over its
 * own token: the portal guard read the cached role, and a student's tab opened
 * the office's portal. Every request in it was refused by the school — but the
 * device's own records were already on screen by then, which on a shared
 * machine is the whole of what signing out is for.
 *
 * Keeping the two together means a tab can only ever read the identity that
 * belongs to the credential it holds. With no token there is nothing to keep,
 * so a write while signed out goes nowhere.
 */
const NAME = 'netpro.session'

const besideTheToken = {
  getItem: (name: string) => {
    try {
      return tokenStore()?.getItem(name) ?? null
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string) => {
    try {
      tokenStore()?.setItem(name, value)
    } catch {
      // Private-mode storage throws; the in-memory store carries the session.
    }
  },
  // Cleared from both, because signing out drops the token first and the
  // answer to "where does it live" is then nowhere.
  removeItem: (name: string) => {
    for (const store of everyStore()) {
      try {
        store.removeItem(name)
      } catch {
        // As above.
      }
    }
  },
}

const withTheToken = createJSONStorage(() => besideTheToken)

/**
 * The signed-in account, kept in the browser so a reload has an identity
 * before `/users/me` has answered again.
 *
 * It is a copy, never an authority: the API decides what an account may do,
 * and the portal guard refetches on every entry and clears this the moment a
 * token is refused or answers for somebody else. Editing it by hand buys a
 * shell with no data in it.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      account: null,
      setAccount: (account) => set({ account }),
      clear: () => set({ account: null }),
    }),
    { name: NAME, storage: withTheToken },
  ),
)

/*
 * A token that has expired since the tab was last open is dropped by
 * `getToken` without anything else being told, so the identity it belonged to
 * would sit in storage naming somebody who is no longer signed in. There is
 * nothing to be signed in *with*, so there is nothing about the person to
 * keep: swept here, at boot, before any screen can read it.
 */
if (!tokenStore()) besideTheToken.removeItem(NAME)

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
 *
 * The device's database is not among the things kept. See `wipeLocalDb`.
 */
export function endSession(queryClient: QueryClient) {
  setToken(null)
  queryClient.clear()
  useSessionStore.getState().clear()
  /*
   * And the copy on disk, wherever it landed. Emptying the store is not enough
   * to reach it: the token has just gone, so a write has nowhere to go and the
   * old value would sit there naming the person who just signed out — on a
   * shared machine, the one thing signing out has to take away.
   */
  besideTheToken.removeItem(NAME)
  useNotificationsStore.getState().clear()
  useAuthStore.getState().reset()

  // And every other tab open on this machine, before the database goes: they
  // are showing the same school's records, and one of them staying up after a
  // sign-out is exactly the shared-laptop case this is all for.
  announceSignOut()

  // And the school's own records off the device. Local-first means real
  // students, guardians and fee balances are in a file on this machine, and in
  // most of these schools the machine is shared — the staff room, the bursar's
  // desk. Signing out has to mean the next person finds nothing.
  void wipeLocalDb()
}
