import { useRouterState } from '@tanstack/react-router'

/**
 * The bar that says a click was heard.
 *
 * TanStack keeps the page you are leaving on screen while the next one's
 * loader runs, and only swaps to a pending component once the wait passes
 * `defaultPendingMs`. That is the right behaviour — a register should not
 * blink into a skeleton because a record took 200ms — but on its own it means
 * a tap on a student's name does nothing visible for as long as the school takes
 * to answer. On the connections this app is for, that is long enough to tap
 * again.
 *
 * So this appears at once, with no threshold: two pixels of brand along the
 * bottom edge of the header, for exactly as long as a loader is running. It
 * sits inside the header, which is sticky, so it stays in view on a long
 * register that has been scrolled.
 *
 * The segment slides rather than fills. Nothing here knows how far along a
 * loader is, and a bar creeping toward a finish line would be inventing one —
 * the same rule the rest of the app follows about figures it was not given.
 * With the motion setting at zero the slide has no duration and the track
 * alone shows, which is still the difference between "working" and "nothing
 * happened".
 */
export function RouteProgress() {
  const loading = useRouterState({ select: (state) => state.isLoading })

  if (!loading) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-brand/15"
    >
      <div className="h-full w-[30%] animate-ems-progress rounded-full bg-brand" />
    </div>
  )
}
