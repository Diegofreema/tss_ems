import { Rule } from '@/components/page/rule'
import { Shimmer } from './shimmer'

/**
 * What a page shows while it is still loading, set once on the router.
 *
 * It earns its place twice over. The obvious half is that a slow page reads as
 * loading rather than as nothing. The other half is structural: TanStack only
 * wraps a match in `<Suspense>` when there is something to show while it is
 * suspended, and without that boundary a component that suspends — every
 * `useSuspenseQuery` whose data is not already in hand — suspends the whole
 * React root and renders a blank document, with no error and nothing to catch.
 *
 * It is shaped like the page that replaces it, and that is the whole point of
 * a skeleton: the kicker, the title and the description of `PageHeader`, the
 * real `Rule` under them, then the raised card that nearly every page ends in
 * — a register, a panel, an empty state. A skeleton whose blocks land
 * somewhere else than the content does is a page that visibly jumps when it
 * arrives, which reads as a bug rather than as loading.
 *
 * **No padding of its own.** Inside a portal this renders in the shell's
 * outlet, which is already `p-content` — a second layer moved every block in
 * by another 24px and then moved it back the moment the page arrived. The
 * shell's own pending state is `ShellPending`, which draws the chrome around
 * one of these.
 */
export function RoutePending() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      {/* PageHeader: kicker over title over description. */}
      <Shimmer className="h-2.5 w-20 rounded-sm" />
      <Shimmer className="mt-2 h-7.5 w-64 rounded-sm" delay={80} />
      <Shimmer className="mt-2.5 h-3 w-[min(30rem,80%)] rounded-sm" delay={140} />

      {/* The real rule, because it is 2px of divider and never anything else. */}
      <Rule />

      <Shimmer className="h-64 w-full rounded-xl" delay={200} />
    </div>
  )
}
