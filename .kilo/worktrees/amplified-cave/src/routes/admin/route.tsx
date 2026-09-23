import { createFileRoute } from '@tanstack/react-router'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { shellPending } from '@/components/feedback/shell-pending'
import { AppShell } from '@/components/layout/app-shell'
import { requirePortal } from '@/features/auth/guard'
import { messageCollections } from '@/db/collections/messages'
import { referenceCollections } from '@/db/collections/reference'
import { recordSearch } from '@/features/collections/resolve'
import { adminPortal } from '@/portals/admin/config'

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ context }) => requirePortal(context.queryClient, 'Admin'),
  // `?record=` opens a thin collection's record modal over its list page.
  validateSearch: recordSearch,
  /**
   * The school's own reference data, readied once for the whole portal.
   *
   * Classes, arms, subjects, fees and the calendar are what every office form
   * offers, so they are on the device before a form is opened rather than
   * fetched when one is — which is the difference between a form that can be
   * filled in with no connection and one that cannot.
   *
   * Started rather than awaited and its failure swallowed, like every portal
   * shell: a shell route that waits or throws takes the shell with it.
   */
  loader: () => {
    for (const collection of [...referenceCollections, ...messageCollections]) {
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
  pendingComponent: shellPending(adminPortal),
  component: () => <AppShell config={adminPortal} />,
  // A path that matched no route: the shell renders and this goes in its
  // outlet, so it is the page content rather than a second shell — nesting one
  // inside the other drew the whole sidebar twice. A `notFound()` thrown from
  // a loader is a different case and is handled on the route that throws it.
  notFoundComponent: portalNotFound(adminPortal),
})
