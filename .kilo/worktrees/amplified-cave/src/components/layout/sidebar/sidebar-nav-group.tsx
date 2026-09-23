import { useMatchRoute } from '@tanstack/react-router'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { NavGroup } from '@/lib/portal'
import { cn } from '@/lib/utils'
import { SidebarNavItem, SidebarSubItem } from './sidebar-nav-item'

/**
 * A section of the rail: one row that opens onto the pages inside it.
 *
 * A section whose own page is open stays marked while it is shut, so somebody
 * three pages into Academics can still see where they are with the section
 * closed. The ungrouped block at the top has no heading and draws its items
 * flat.
 */
export function SidebarNavGroup({
  group,
  collapsed,
  onToggle,
  onNavigate,
}: {
  group: NavGroup
  collapsed: boolean
  onToggle: () => void
  onNavigate: () => void
}) {
  const matchRoute = useMatchRoute()
  const Icon = group.icon
  const Chevron = collapsed ? ChevronRight : ChevronDown

  if (!group.heading) {
    return (
      <div className="space-y-1.5">
        {group.items.map((item) => (
          <SidebarNavItem key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    )
  }

  const holdsOpenPage = group.items.some((item) =>
    Boolean(matchRoute({ to: item.to, fuzzy: true })),
  )

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className={cn(
          'flex h-(--rail-row) w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-[15px] transition-colors',
          holdsOpenPage && collapsed
            ? 'bg-brand/10 font-medium text-brand-700'
            : 'hover:bg-neutral-100',
          'group-data-[rail=shut]:justify-center group-data-[rail=shut]:gap-0',
        )}
        title={group.heading}
      >
        {Icon && <Icon className="size-5 flex-none" strokeWidth={1.9} />}
        <span className="rail-label flex-1">{group.heading}</span>
        {/* No chevron on a narrowed rail: there is nothing it could open onto
            until the rail is wide enough to hold a list of words. */}
        <Chevron
          className="rail-wordy size-4 flex-none text-muted-foreground"
          strokeWidth={2}
        />
      </button>

      {!collapsed && (
        // The line the ticks hang off, aligned under the section's own icon.
        <div className="rail-wordy relative mt-1 ml-5.5 space-y-0.5 border-l border-divider pl-0">
          {group.items.map((item) => (
            <SidebarSubItem key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}
