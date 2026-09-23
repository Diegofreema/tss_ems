import { createFileRoute } from '@tanstack/react-router'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { shellPending } from '@/components/feedback/shell-pending'
import { AppShell } from '@/components/layout/app-shell'
import { requirePortal } from '@/features/auth/guard'
import { recordSearch } from '@/features/collections/resolve'
import { messageCollections } from '@/db/collections/messages'
import { parentCollections } from '@/db/collections/parent'
import { parentPortal } from '@/portals/parent/config'

export const Route = createFileRoute('/parent')({
  beforeLoad: ({ context }) => requirePortal(context.queryClient, 'Parent'),
  // `?record=` opens a thin collection's record modal over its list page.
  validateSearch: recordSearch,
  /**
   * Every page under here reads the household, and so does the switcher in the
   * shell around them — loading it once at the top means none of them waits on
   * it and no two of them ask for it.
   *
   * Started rather than awaited, and its failure swallowed. This route draws
   * the shell, and a shell route that waits or throws takes the shell with it:
   * awaiting leaves the whole portal on a bare loading screen every time the
   * household goes stale, and throwing replaces the sidebar, header and
   * switcher with an error page.
   *
   * The pages below read the same collections live, so both land where they
   * belong — a page still loading, or a page that could not load, inside a
   * portal that works either way. Offline this resolves off the device and
   * the portal opens with the household already in it.
   */
  loader: () => {
    for (const collection of [...parentCollections, ...messageCollections]) {
      void collection.preload().catch(() => undefined)
    }
  },
  /*
   * The first sign-in on a device waits here on `/users/me` — the guard has no
   * cached account to open the portal over — so this is the one pending state
   * a person actually reads. It draws this shell rather than the default page
   * skeleton, which had no sidebar or header and so replaced itself with the
   * whole application in a single frame.
   */
  pendingComponent: shellPending(parentPortal),
  component: () => <AppShell config={parentPortal} />,
  // A path that matched no route: the shell renders and this goes in its
  // outlet, so it is the page content rather than a second shell — nesting one
  // inside the other drew the whole sidebar twice. A `notFound()` thrown from
  // a loader is a different case and is handled on the route that throws it.
  notFoundComponent: portalNotFound(parentPortal),
})
