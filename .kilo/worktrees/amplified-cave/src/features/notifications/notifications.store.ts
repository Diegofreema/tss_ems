import { create } from 'zustand'

type NotificationsState = {
  /** Ids the user has opened or marked read. */
  read: Record<string, boolean>
  markRead: (id: string) => void
  markAllRead: (ids: string[]) => void
  clear: () => void
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  read: {},
  markRead: (id) => set((state) => ({ read: { ...state.read, [id]: true } })),
  markAllRead: (ids) =>
    set((state) => ({
      read: { ...state.read, ...Object.fromEntries(ids.map((id) => [id, true])) },
    })),
  // Signing out drops these: the ids are the school's own notice ids, shared
  // across every account, so the next person to sign in on this device would
  // otherwise find notices they have never opened already dimmed.
  clear: () => set({ read: {} }),
}))
