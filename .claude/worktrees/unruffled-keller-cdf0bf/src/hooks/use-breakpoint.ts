import { useSyncExternalStore } from 'react'

/** The design's two breakpoints: a drawer sidebar, then tables as cards. */
const QUERIES = {
  narrow: '(max-width: 899px)',
  phone: '(max-width: 639px)',
} as const

export type Breakpoint = keyof typeof QUERIES

/**
 * One MediaQueryList per breakpoint, created once — `useSyncExternalStore`
 * needs stable `subscribe`/`getSnapshot` identities to avoid resubscribing
 * on every render.
 */
const stores = Object.fromEntries(
  Object.entries(QUERIES).map(([name, query]) => {
    const list = window.matchMedia(query)
    return [
      name,
      {
        subscribe: (onChange: () => void) => {
          list.addEventListener('change', onChange)
          return () => list.removeEventListener('change', onChange)
        },
        getSnapshot: () => list.matches,
      },
    ]
  }),
) as Record<
  Breakpoint,
  { subscribe: (onChange: () => void) => () => void; getSnapshot: () => boolean }
>

export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const store = stores[breakpoint]
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
