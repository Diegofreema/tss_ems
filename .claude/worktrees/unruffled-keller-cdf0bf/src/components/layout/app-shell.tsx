import { Outlet, useLocation, useMatches } from '@tanstack/react-router'
import { useEffect } from 'react'
import type { Heading } from '@/features/collections/resolve'
import { NotificationBell } from '@/features/notifications/components/notification-bell'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import type { ListPath } from '@/features/collections/types'
import type { PortalConfig } from '@/lib/portal'
import { useShellStore } from '@/stores/shell.store'
import { AppHeader } from './header/app-header'
import { OfflineBanner } from './offline-banner'
import { Sidebar } from './sidebar/sidebar'

function headingOf(match: {
  staticData: { title?: string; crumb?: string; crumbTo?: ListPath }
  loaderData?: unknown
}): Heading | undefined {
  if (match.staticData.title) {
    return {
      title: match.staticData.title,
      crumb: match.staticData.crumb ?? '',
      // A static route names its parent page as a path; a route whose crumb
      // is only the section it sits in names none, and gets no link.
      crumbTo: match.staticData.crumbTo && { to: match.staticData.crumbTo },
    }
  }
  // Routes whose title depends on the record publish it from their loader.
  const fromLoader = (match.loaderData as { heading?: Heading } | undefined)?.heading
  return fromLoader
}

/**
 * Routes describe their own header text; the shell reads the deepest one.
 *
 * A 404 has no route to ask, and its `notFoundComponent` renders inside this
 * shell rather than around it — so the header is titled from the match's own
 * state instead. The router marks the two kinds differently: a path that
 * matched nothing sets `_notFound` on the closest route it did match, and a
 * `notFound()` thrown from a loader leaves that route's own status at
 * `notFound`. Missing either leaves the header blank over a 404.
 *
 * `_notFound` is the router's own flag and carries its underscore: if a future
 * version drops it the build fails here, which is the whole cost.
 */
function useRouteHeading(): Heading {
  const matches = useMatches()
  for (const match of [...matches].reverse()) {
    if (match._notFound || match.status === 'notFound') {
      return { title: 'Not found', crumb: '' }
    }
    const heading = headingOf(match)
    if (heading) return heading
  }
  return { title: '', crumb: '' }
}

export function AppShell({ config }: { config: PortalConfig }) {
  const notifications = config.useNotifications()
  const narrow = useBreakpoint('narrow')
  const drawerOpen = useShellStore((state) => state.drawerOpen)
  const closeDrawer = useShellStore((state) => state.closeDrawer)
  const { pathname } = useLocation()
  const { title, crumb, crumbTo } = useRouteHeading()

  const drawerVisible = narrow && drawerOpen

  useEffect(() => {
    if (!drawerVisible) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerVisible, closeDrawer])

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {(!narrow || drawerVisible) && (
        <Sidebar config={config} asDrawer={narrow} />
      )}

      {drawerVisible && (
        <div
          className="fixed inset-0 z-30 animate-ems-fade bg-neutral-900/45"
          onClick={closeDrawer}
          aria-hidden
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          crumb={crumb}
          crumbTo={crumbTo}
          title={title}
          status={config.headerStatus}
          narrow={narrow}
        >
          <NotificationBell
            notifications={notifications}
            allPath={`${config.basePath}/notifications`}
          />
        </AppHeader>
        <OfflineBanner />
        {config.contextBar}

        {/* Keyed on the route so the entrance animation replays on navigation. */}
        <div key={pathname} className="flex-1 animate-ems-in p-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
