import { Menu, PanelLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { RouteProgress } from '@/components/layout/route-progress'
import { cn } from '@/lib/utils'
import type { AccountSummary } from '@/lib/account'
import { useShellStore } from '@/stores/shell.store'
import { AccountChip } from './account-chip'
import { HeaderSearch } from './header-search'
import { ThemeToggle } from './theme-toggle'

/**
 * Search on the left, the controls and whoever is signed in on the right.
 *
 * The page's own title used to live here, over a breadcrumb. It has gone to
 * the page: every screen already opens with its title, so the header was
 * saying it twice — and the second saying cost the width the search box now
 * has. The one place it still earns its keep is a narrow viewport, where the
 * menu button stands in its place.
 */
export function AppHeader({
  searchPath,
  account,
  profilePath,
  narrow,
  children,
}: {
  /** Set only by a portal with something to search. */
  searchPath?: string
  account: AccountSummary
  profilePath: string
  narrow: boolean
  /** The sync chip, the messages door and the notification bell. */
  children?: ReactNode
}) {
  const openDrawer = useShellStore((state) => state.openDrawer)
  const railShut = useShellStore((state) => state.railShut)
  const toggleRail = useShellStore((state) => state.toggleRail)

  return (
    <header className="sticky top-0 z-20 flex h-(--shell-header) items-center gap-3 border-b border-divider bg-raised px-content">
      {/* One button, one place, two jobs — because they are the same job seen
          at two widths. Narrow, there is no rail and this opens the drawer
          over the page; wide, it folds the rail down to its icons. Here rather
          than on the rail itself: a control that moves with the thing it
          controls is a control somebody has to find twice. */}
      {narrow ? (
        <Button
          variant="outline"
          size="icon"
          onClick={openDrawer}
          aria-label="Open the menu"
          className="size-10 flex-none rounded-lg"
        >
          <Menu className="size-[18px]" strokeWidth={2} />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="icon"
          onClick={toggleRail}
          aria-label={railShut ? 'Widen the menu' : 'Narrow the menu'}
          aria-pressed={railShut}
          className="size-10 flex-none rounded-lg"
        >
          <PanelLeft
            className={cn(
              'size-[18px] transition-transform duration-200',
              railShut && 'rotate-180',
            )}
            strokeWidth={2}
          />
        </Button>
      )}

      {searchPath ? <HeaderSearch to={searchPath} /> : null}

      <div className="flex-1" />

      {children}
      <ThemeToggle />
      <AccountChip account={account} profilePath={profilePath} />

      {/* Sits on the header's own bottom border, so it is in view however far
          a long register has been scrolled. See `RouteProgress`. */}
      <RouteProgress />
    </header>
  )
}
