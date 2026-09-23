import { createFileRoute } from '@tanstack/react-router'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { shellPending } from '@/components/feedback/shell-pending'
import { AppShell } from '@/components/layout/app-shell'
import { requirePortal } from '@/features/auth/guard'
import { schoolingCollections } from '@/db/collections/schooling'
import { recordSearch } from '@/features/collections/resolve'
import { studentPortal } from '@/portals/student/config'

export const Route = createFileRoute('/student')({
  beforeLoad: ({ context }) => requirePortal(context.queryClient, 'Student'),
  // `?record=` opens a thin collection's record modal over its list page.
  validateSearch: recordSearch,
  /**
   * The student's own sets, readied once for the whole portal.
   *
   * Started rather than awaited and its failure swallowed: this route draws the
   * shell, and a shell route that waits or throws takes the shell with it. The
   * pages below read the same sets live, so a page still loading and a page
   * that could not load both land inside a portal that works either way.
   */
  loader: () => {
    for (const collection of schoolingCollections) {
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
  pendingComponent: shellPending(studentPortal),
  component: () => <AppShell config={studentPortal} />,
  // A path that matched no route: the shell renders and this goes in its
  // outlet, so it is the page content rather than a second shell — nesting one
  // inside the other drew the whole sidebar twice. A `notFound()` thrown from
  // a loader is a different case and is handled on the route that throws it.
  notFoundComponent: portalNotFound(studentPortal),
})
