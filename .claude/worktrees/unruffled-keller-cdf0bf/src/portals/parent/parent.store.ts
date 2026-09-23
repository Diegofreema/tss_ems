import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { create } from 'zustand'
import { useSessionStore } from '@/stores/session.store'
import { familyQuery, parentIdOf } from './api/family'
import type { Child } from './family'

type ParentStore = {
  /** The child most pages are scoped to. Null until the switcher is used. */
  childId: number | null
  selectChild: (childId: number) => void
}

/**
 * The child switcher scopes results, attendance, invoices and assignments,
 * so it outlives any one page — app-wide state rather than a per-page filter.
 *
 * It holds the child's id rather than their place in the list: the list is
 * fetched, and a household that gains or loses a child would otherwise leave
 * the selection pointing at somebody else.
 */
export const useParentStore = create<ParentStore>((set) => ({
  childId: null,
  selectChild: (childId) => set({ childId }),
}))

/** The guardian record the signed-in account belongs to. */
export function useParentId(): number | null {
  return parentIdOf(useSessionStore((state) => state.account))
}

/**
 * The household. Primed by the portal's own route loader, so every page and
 * the switcher above them read it without waiting or re-fetching.
 */
export function useFamily(): Child[] {
  return useSuspenseQuery(familyQuery(useParentId())).data
}

/**
 * The household as the shell around the pages reads it: empty while it is
 * loading, and empty if it never loads.
 *
 * The chrome must not suspend or throw on it. Both are drawn by this portal's
 * own route, and anything that throws there takes the whole shell down with
 * it — a switcher is not worth a blank page. The pages below use `useFamily`
 * and surface the failure where it belongs.
 */
export function useLoadedFamily(): Child[] {
  return useQuery(familyQuery(useParentId())).data ?? []
}

/**
 * Stands in for a child on an account with none linked, so every page reaches
 * its own empty state — "No invoices raised" — rather than a guard.
 */
const NO_CHILD: Child = {
  id: 0,
  name: 'your child',
  full: 'No child linked',
  arm: '—',
  adm: '—',
  owing: 0,
  paid: 0,
  present: 0,
  marked: 0,
  weeks: [],
  invoices: [],
}

/** The child the switcher is on, or the first on the record. */
export function useSelectedChild(): Child {
  const family = useFamily()
  const childId = useParentStore((state) => state.childId)
  return family.find((child) => child.id === childId) ?? family[0] ?? NO_CHILD
}
