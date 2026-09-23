import { ChevronDown, ChevronRight } from 'lucide-react'
import type { NavGroup } from '@/lib/portal'
import { SidebarNavItem } from './sidebar-nav-item'

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
  const Chevron = collapsed ? ChevronRight : ChevronDown

  return (
    <div className="mb-1.5">
      {group.heading && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex w-full cursor-pointer items-center justify-between px-2 pt-3 pb-2 font-heading text-2xs font-extrabold uppercase tracking-[0.12em] text-neutral-600 transition-colors hover:text-foreground"
        >
          <span>{group.heading}</span>
          <Chevron className="size-3.25" strokeWidth={2.5} />
        </button>
      )}

      {!collapsed &&
        group.items.map((item, index) => (
          <SidebarNavItem
            key={item.to}
            item={item}
            index={index}
            onNavigate={onNavigate}
          />
        ))}
    </div>
  )
}
