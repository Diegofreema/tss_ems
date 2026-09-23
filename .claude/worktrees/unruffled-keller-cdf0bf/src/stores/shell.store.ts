import { create } from 'zustand'

type ShellState = {
  /** Mobile drawer, only meaningful under the `narrow` breakpoint. */
  drawerOpen: boolean
  /** Sidebar nav groups keyed by heading; absent means open. */
  collapsedGroups: Record<string, boolean>
  navQuery: string

  openDrawer: () => void
  closeDrawer: () => void
  toggleGroup: (heading: string) => void
  setNavQuery: (navQuery: string) => void
}

export const useShellStore = create<ShellState>()((set) => ({
  drawerOpen: false,
  collapsedGroups: {},
  navQuery: '',

  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),

  toggleGroup: (heading) =>
    set((state) => ({
      collapsedGroups: {
        ...state.collapsedGroups,
        [heading]: !state.collapsedGroups[heading],
      },
    })),

  setNavQuery: (navQuery) => set({ navQuery }),
}))
