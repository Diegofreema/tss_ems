import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ShellState = {
  /** Mobile drawer, only meaningful under the `narrow` breakpoint. */
  drawerOpen: boolean
  /** Sidebar nav groups keyed by heading; absent means collapsed. */
  expandedGroups: Record<string, boolean>
  /**
   * The rail narrowed to its icons. Only meaningful above the `narrow`
   * breakpoint, where there is a rail at all — below it the sidebar is a
   * drawer and this says nothing.
   */
  railShut: boolean
  navQuery: string

  openDrawer: () => void
  closeDrawer: () => void
  toggleGroup: (heading: string) => void
  toggleRail: () => void
  setNavQuery: (navQuery: string) => void
}

/**
 * How a person has arranged the rail, remembered on the device so a reload
 * keeps their layout: which sections they opened, and whether they narrowed
 * the rail to its icons. Sections start collapsed, so only the headings they
 * expanded are stored. The drawer and the search box are transient and stay
 * out of storage.
 */
export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      drawerOpen: false,
      expandedGroups: {},
      railShut: false,
      navQuery: '',

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),

      toggleGroup: (heading) =>
        set((state) => ({
          expandedGroups: {
            ...state.expandedGroups,
            [heading]: !state.expandedGroups[heading],
          },
        })),

      toggleRail: () => set((state) => ({ railShut: !state.railShut })),

      setNavQuery: (navQuery) => set({ navQuery }),
    }),
    {
      name: 'netpro.shell',
      partialize: (state) => ({
        expandedGroups: state.expandedGroups,
        railShut: state.railShut,
      }),
    },
  ),
)
