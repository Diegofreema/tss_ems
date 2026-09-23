import { Shimmer } from './shimmer'

/**
 * What a route shows while it is still loading, set once on the router.
 *
 * It earns its place twice over. The obvious half is that a slow page reads as
 * loading rather than as nothing. The other half is structural: TanStack only
 * wraps a match in `<Suspense>` when there is something to show while it is
 * suspended, and without that boundary a component that suspends — every
 * `useSuspenseQuery` whose data is not already in hand — suspends the whole
 * React root and renders a blank document, with no error and nothing to catch.
 */
export function RoutePending() {
  return (
    <div className="p-content" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Shimmer className="h-3 w-24" />
      <Shimmer className="mt-3.5 h-[34px] w-64" delay={80} />
      <Shimmer className="mt-6 h-[104px] w-full" delay={160} />
    </div>
  )
}
