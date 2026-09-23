import { createFileRoute } from '@tanstack/react-router'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { shellPending } from '@/components/feedback/shell-pending'
import { AppShell } from '@/components/layout/app-shell'
import { requirePortal } from '@/features/auth/guard'
import { messageCollections } from '@/db/collections/messages'
import { teachingCollections } from '@/db/collections/teaching'
import { recordSearch } from '@/features/collections/resolve'
import { teacherPortal } from '@/portals/teacher/config'

export const Route = createFileRoute('/teacher')({
  beforeLoad: ({ context }) => requirePortal(context.queryClient, 'Teacher'),
  // `?record=` opens a thin collection's record modal over its list page.
  validateSearch: recordSearch,
  /**
   * The teacher's own sets, readied once for the whole portal.
   *
   * Started rather than awaited, and its failure swallowed. This route draws
   * the shell, and a shell route that waits or throws takes the shell with it:
   * awaiting leaves the portal on a bare loading screen every time a set goes
   * stale, and throwing replaces the sidebar and header with an error page.
   *
   * The registers below read the same collections live, so a page still
   * loading and a page that could not load both land where they belong, inside
   * a portal that works either way. With no connection this resolves off the
   * device and the roll, the subjects and the marks are already there.
   */
  loader: () => {
    for (const collection of [...teachingCollections, ...messageCollections]) {
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
  pendingComponent: shellPending(teacherPortal),
  component: () => <AppShell config={teacherPortal} />,
  // A path that matched no route: the shell renders and this goes in its
  // outlet, so it is the page content rather than a second shell — nesting one
  // inside the other drew the whole sidebar twice. A `notFound()` thrown from
  // a loader is a different case and is handled on the route that throws it.
  notFoundComponent: portalNotFound(teacherPortal),
})
