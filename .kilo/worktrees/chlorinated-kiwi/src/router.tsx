import { createRouter } from '@tanstack/react-router'
import { RouteError } from '@/components/feedback/route-error'
import { RoutePending } from '@/components/feedback/route-pending'
import type { ListPath } from '@/features/collections/types'
import { queryClient } from '@/lib/query-client'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  /*
   * How long a route preloaded on hover stays usable once the link is clicked.
   *
   * This was 0, which quietly cancelled the preload it sits beside: a record
   * page's loader fetches the record over the wire, hovering the link ran that
   * fetch, and a zero window meant the answer was stale before the finger came
   * down — so the click fetched the same record a second time and the reader
   * watched the register they were leaving for the whole round trip. Two
   * requests, and the wait they were meant to remove.
   *
   * Ten seconds covers hovering a name and clicking it, and little else. It is
   * a third of the staleness the query cache already accepts everywhere, and
   * the loader still re-runs on any navigation that was not preloaded — a
   * back button, a typed URL, a redirect after a save.
   */
  defaultPreloadStaleTime: 10_000,
  /*
   * When a slow page gives up on the old one and shows its skeleton.
   *
   * The default is a full second, which on these connections is a click that
   * appears to have done nothing. `RouteProgress` now answers the click at
   * once, so this only has to decide when the wait is long enough that the
   * page you are leaving stops being useful to look at — a third of a second.
   * `PendingMinMs` then holds the skeleton long enough that it cannot strobe
   * on a page that arrives just after it appeared.
   */
  defaultPendingMs: 350,
  defaultPendingMinMs: 300,
  scrollRestoration: true,
  // Every route is its own error boundary, and without this they all fall
  // through to the router's built-in one — a stack trace on a white page,
  // which says nothing to a bursar and hides what the API actually answered.
  defaultErrorComponent: RouteError,
  // And its own suspense boundary, which is what this one buys: without a
  // pending component there is no `<Suspense>` around a match, so a page whose
  // data is not already in hand suspends the whole root and draws nothing at
  // all. See `RoutePending`.
  defaultPendingComponent: RoutePending,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }

  /** Each route carries the text the shell header shows for it. */
  interface StaticDataRouteOption {
    title?: string
    crumb?: string
    /** The page the crumb names, where it names one — it links there. */
    crumbTo?: ListPath
  }
}
