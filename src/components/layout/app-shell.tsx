import { Outlet, useLocation } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { DeniedState } from '@/components/feedback/denied-state'
import { DefaultPasswordGate } from '@/features/auth/components/default-password-gate'
import { visibleNav } from '@/features/auth/privileges'
import { useAccountSummary } from '@/features/auth/session'
import { MessagesButton } from '@/features/messages/components/messages-button'
import { NotificationBell } from '@/features/notifications/components/notification-bell'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { navLabel, type PortalConfig } from '@/lib/portal'
import { useShellStore } from '@/stores/shell.store'
import { AppHeader } from './header/app-header'
import { OfflineBanner } from './offline-banner'
import { Sidebar } from './sidebar/sidebar'
import { SyncChip } from './sync-chip'

/** A portal with no sections to grant opens all of itself. */
const OPEN_DOOR = (_path: string) => true
const useEverything = () => OPEN_DOOR

export function AppShell({ config: portal }: { config: PortalConfig }) {
  const config = usePortalFor(portal)
  const mayOpen = (portal.useMayOpen ?? useEverything)()
  const notifications = config.useNotifications()
  const narrow = useBreakpoint('narrow')
  const drawerOpen = useShellStore((state) => state.drawerOpen)
  const closeDrawer = useShellStore((state) => state.closeDrawer)
  const { pathname } = useLocation()
  const account = useAccountSummary(config.roleLabel)

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
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* Here rather than in each portal's shell: every one of the four is
          this component with a different config, and a gate that has to be
          remembered four times is one that will be remembered three. It draws
          nothing at all for an account the school has not flagged. */}
      <DefaultPasswordGate />

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

      <main className="flex min-w-0 flex-1 flex-col bg-ground">
        <AppHeader
          searchPath={config.searchPath}
          account={account}
          profilePath={`${config.basePath}/profile`}
          narrow={narrow}
        >
          <SyncChip />
          {config.messagesPath && mayOpen(config.messagesPath) && (
            <MessagesButton to={config.messagesPath} />
          )}
          <NotificationBell
            notifications={notifications}
            allPath={`${config.basePath}/notifications`}
          />
        </AppHeader>
        <OfflineBanner />
        {config.contextBar}

        {/* Keyed on the route so the entrance animation replays on navigation. */}
        <div
          key={pathname}
          className="@container/page mx-auto w-full max-w-[1280px] flex-1 animate-ems-in p-content"
        >
          {mayOpen(pathname) ? (
            <Outlet />
          ) : (
            <DeniedState
              pageName={navLabel(portal, pathname)}
              body={config.closedBecause?.(pathname)}
              ask="An administrator who manages privileges"
              dashboardPath={config.basePath}
            />
          )}
        </div>
      </main>
    </div>
  )
}

/**
 * The portal as this account may see it: the rail cut down to the pages it
 * may open, and Settings pointed at the person's own record where the school's
 * settings are closed to them — the rail's Tools row is on every page, and a
 * door on every page that opens onto "you cannot open this" is worse than one
 * that opens onto something of theirs.
 *
 * Here rather than in the sidebar, so the header, the rail and the outlet all
 * ask the one question and cannot disagree about the answer.
 */
function usePortalFor(portal: PortalConfig): PortalConfig {
  const mayOpen = (portal.useMayOpen ?? useEverything)()
  return useMemo(() => {
    const settings = portal.settingsPath ?? `${portal.basePath}/profile`
    return {
      ...portal,
      nav: visibleNav(portal.nav, mayOpen),
      searchPath: portal.searchPath && mayOpen(portal.searchPath) ? portal.searchPath : undefined,
      settingsPath: mayOpen(settings) ? settings : `${portal.basePath}/profile`,
    }
  }, [portal, mayOpen])
}
