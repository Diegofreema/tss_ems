import { createFileRoute } from '@tanstack/react-router'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { AppShell } from '@/components/layout/app-shell'
import { requirePortal } from '@/features/auth/guard'
import { teacherPortal } from '@/portals/teacher/config'

export const Route = createFileRoute('/teacher')({
  beforeLoad: ({ context }) => requirePortal(context.queryClient, 'Teacher'),
  component: () => <AppShell config={teacherPortal} />,
  // A path that matched no route: the shell renders and this goes in its
  // outlet, so it is the page content rather than a second shell — nesting one
  // inside the other drew the whole sidebar twice. A `notFound()` thrown from
  // a loader is a different case and is handled on the route that throws it.
  notFoundComponent: portalNotFound(teacherPortal),
})
