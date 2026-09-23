import { useLiveQuery } from '@tanstack/react-db'
import { create } from 'zustand'
import {
  parentAttendance,
  parentChildren,
  parentInvoices,
} from '@/db/collections/parent'
import { useSessionStore } from '@/stores/session.store'
import { parentIdOf } from './api/family'
import { composeFamily, type Child, type OwnedMark } from './family'

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
 * The household, read off the device.
 *
 * Three live queries over the three sets the portal keeps locally, composed on
 * every render by a pure function. Nothing here waits on the school: the rows
 * are already here, and when a sync brings new ones the queries recompute and
 * the pages follow. That is the whole of what local-first buys this portal —
 * a guardian in a village with no signal opens the app and their children,
 * their bills and their attendance are simply there.
 *
 * No longer suspends. There is nothing to suspend on once the reading is
 * local, so the callers that used to get a suspense boundary now get an empty
 * household for the one frame before the collections are ready.
 */
export function useFamily(): Child[] {
  const children = useLiveQuery({ query: (q) => q.from({ child: parentChildren }) })
  const invoices = useLiveQuery({ query: (q) => q.from({ invoice: parentInvoices }) })
  const marks = useLiveQuery({ query: (q) => q.from({ mark: parentAttendance }) })

  // Recomposed rather than memoised: `familyChild` is a few filters and a sum
  // over a household, which is a handful of children and a few dozen bills.
  return composeFamily(
    children.data ?? [],
    invoices.data ?? [],
    (marks.data ?? []) as OwnedMark[],
    new Date(),
  )
}

/**
 * The household as the shell around the pages reads it.
 *
 * Kept as its own name even though it now does exactly what `useFamily` does:
 * the distinction it was drawing — one reader may suspend, the other may not —
 * stopped existing when the reading became local, and collapsing the two at
 * the call sites is a change for the chrome to make on its own terms rather
 * than a side effect of this one.
 */
export function useLoadedFamily(): Child[] {
  return useFamily()
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
