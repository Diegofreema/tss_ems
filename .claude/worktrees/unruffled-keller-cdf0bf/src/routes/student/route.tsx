import { createFileRoute } from '@tanstack/react-router'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { AppShell } from '@/components/layout/app-shell'
import { requirePortal } from '@/features/auth/guard'
import { studentPortal } from '@/portals/student/config'

export const Route = createFileRoute('/student')({
  beforeLoad: ({ context }) => requirePortal(context.queryClient, 'Student'),
  component: () => <AppShell config={studentPortal} />,
  // A path that matched no route: the shell renders and this goes in its
  // outlet, so it is the page content rather than a second shell — nesting one
  // inside the other drew the whole sidebar twice. A `notFound()` thrown from
  // a loader is a different case and is handled on the route that throws it.
  notFoundComponent: portalNotFound(studentPortal),
})
