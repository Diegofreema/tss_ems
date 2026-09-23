import { useMemo } from 'react'
import { useAccountSummary } from '@/features/auth/session'
import type { PortalConfig } from '@/lib/portal'
import { cn } from '@/lib/utils'
import { useShellStore } from '@/stores/shell.store'
import { SidebarAccountMenu } from './sidebar-account-menu'
import { SidebarBrand } from './sidebar-brand'
import { SidebarNavGroup } from './sidebar-nav-group'
import { SidebarSearch } from './sidebar-search'

function filterNav(nav: PortalConfig['nav'], query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return nav

  return nav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(needle),
      ),
    }))
    .filter((group) => group.items.length > 0)
}

/**
 * 248px fixed rail on desktop; the parent renders it inside a drawer when the
 * viewport is narrow.
 */
export function Sidebar({
  config,
  asDrawer,
}: {
  config: PortalConfig
  asDrawer: boolean
}) {
  const navQuery = useShellStore((state) => state.navQuery)
  const collapsedGroups = useShellStore((state) => state.collapsedGroups)
  const toggleGroup = useShellStore((state) => state.toggleGroup)
  const closeDrawer = useShellStore((state) => state.closeDrawer)
  const account = useAccountSummary(config.roleLabel)

  const nav = useMemo(
    () => (config.searchableNav ? filterNav(config.nav, navQuery) : config.nav),
    [config.nav, config.searchableNav, navQuery],
  )

  return (
    <aside
      className={cn(
        'z-40 flex h-screen w-62 flex-none flex-col border-r border-divider bg-background',
        asDrawer ? 'fixed inset-y-0 left-0 animate-ems-drawer' : 'sticky top-0',
      )}
    >
      <SidebarBrand roleLabel={config.roleLabel} />
      {config.searchableNav ? <SidebarSearch /> : config.context}

      <nav className="flex-1 overflow-y-auto px-2 pt-1 pb-5">
        {nav.map((group, index) => (
          <SidebarNavGroup
            key={group.heading ?? `group-${index}`}
            group={group}
            collapsed={Boolean(group.heading && collapsedGroups[group.heading])}
            onToggle={() => group.heading && toggleGroup(group.heading)}
            onNavigate={closeDrawer}
          />
        ))}
      </nav>

      <SidebarAccountMenu
        account={account}
        profilePath={`${config.basePath}/profile`}
      />
    </aside>
  )
}
