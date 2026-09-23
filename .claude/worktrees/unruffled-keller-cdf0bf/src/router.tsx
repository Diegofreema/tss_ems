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
  defaultPreloadStaleTime: 0,
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
