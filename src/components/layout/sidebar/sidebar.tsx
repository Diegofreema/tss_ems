import { useEffect, useState } from 'react'
import type { PortalConfig } from '@/lib/portal'
import { cn } from '@/lib/utils'
import { useShellStore } from '@/stores/shell.store'
import { SidebarBrand } from './sidebar-brand'
import { SidebarNavGroup } from './sidebar-nav-group'
import { SidebarTools } from './sidebar-tools'

/**
 * The rail: 264px of it, or 72px of icons when it has been shut.
 *
 * Two elements, not one, and that is the whole trick. The outer slot is what
 * sits in the shell's flex row and is what the page's own column is measured
 * against; the rail inside it is positioned, so it can be wider than the slot
 * without moving anything. Shutting the rail narrows both and the page slides
 * over to take the room. *Hovering* a shut rail widens only the inner one, so
 * the register being read does not reflow every time the pointer crosses the
 * mark — the rail floats over it with a shadow and goes again.
 *
 * The peek is on focus as well as hover, or a keyboard reader tabbing into a
 * shut rail would move through labels nobody can see. It is dropped on Escape
 * for the same reason any hovering panel is.
 *
 * `data-rail` is what the collapsed styling hangs off, in `index.css` — one
 * attribute rather than a `shut` prop threaded through four components, which
 * is also what keeps the words fading rather than disappearing.
 *
 * None of this applies in the drawer: below the narrow breakpoint the sidebar
 * is a sheet over the page, already at its full width, and shutting a sheet to
 * 72px would be a menu nobody asked to fold.
 */
export function Sidebar({
  config,
  asDrawer,
}: {
  config: PortalConfig
  asDrawer: boolean
}) {
  const expandedGroups = useShellStore((state) => state.expandedGroups)
  const toggleGroup = useShellStore((state) => state.toggleGroup)
  const closeDrawer = useShellStore((state) => state.closeDrawer)
  const railShut = useShellStore((state) => state.railShut)
  const [peeking, setPeeking] = useState(false)

  const shut = railShut && !asDrawer
  // Derived, not stored: a peek is only a peek while the rail is shut, so
  // opening the rail ends one without anything having to remember to.
  const peek = shut && peeking
  // What the rail is actually showing, which is what everything inside reads.
  const narrowed = shut && !peek

  useEffect(() => {
    if (!peek) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPeeking(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [peek])

  return (
    <div
      className={cn(
        'rail-swing z-40 flex-none',
        // Nothing at all in the drawer: the sheet is `fixed` and lies over the
        // page, so a slot holding its width open would push the page aside as
        // well — 264px of empty ground on a phone, behind the sheet.
        asDrawer ? 'w-0' : shut ? 'w-(--rail-shut)' : 'w-(--rail-open)',
      )}
    >
      <aside
        data-rail={narrowed ? 'shut' : peek ? 'peek' : 'open'}
        onPointerEnter={() => shut && setPeeking(true)}
        onPointerLeave={() => setPeeking(false)}
        onFocusCapture={() => shut && setPeeking(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPeeking(false)
        }}
        className={cn(
          'group rail-swing flex h-dvh flex-col border-r border-divider bg-raised',
          asDrawer
            ? 'fixed inset-y-0 left-0 w-66 animate-ems-drawer'
            : 'sticky top-0 overflow-x-hidden',
          !asDrawer && (narrowed ? 'w-(--rail-shut)' : 'w-(--rail-open)'),
        )}
      >
        <SidebarBrand />
        {/* Hidden while the rail is narrowed: the term card is four words and
            a label, and there is no icon it could shrink to. */}
        <div className="rail-wordy">{config.context}</div>

        <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden px-4 pb-6">
          {config.nav.map((group, index) => (
            <SidebarNavGroup
              key={group.heading ?? `group-${index}`}
              group={group}
              // A narrowed rail shows no section's contents — there is no room
              // for a list of words under an icon. Opening it again restores
              // whatever the reader had open, because this does not write.
              collapsed={
                narrowed || Boolean(group.heading && !expandedGroups[group.heading])
              }
              onToggle={() => group.heading && toggleGroup(group.heading)}
              onNavigate={closeDrawer}
            />
          ))}
        </nav>

        <SidebarTools
          settingsPath={config.settingsPath ?? `${config.basePath}/profile`}
          onNavigate={closeDrawer}
        />
      </aside>
    </div>
  )
}
