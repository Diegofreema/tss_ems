import { Link } from '@tanstack/react-router'
import { Tag } from '@/components/common/tag'
import { isPortalHome } from '@/lib/nav'
import type { NavItem } from '@/lib/portal'
import { cn } from '@/lib/utils'

/**
 * A row of the rail. Active is the design's filled blue pill — no left bar, no
 * wash: one row is where you are, and it is the only coloured thing on the
 * rail.
 *
 * The `title` is for the narrowed rail, where the label is faded to nothing
 * and the icon is all there is. It stays the row's accessible name either way
 * — the word is still in the DOM, only its width is gone — so this is for a
 * pointer, which has no other way to ask what an icon means.
 */
export function SidebarNavItem({
  item,
  onNavigate,
}: {
  item: NavItem
  onNavigate: () => void
}) {
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={{ exact: isPortalHome(item.to) }}
      className={cn(
        'flex h-(--rail-row) w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] transition-colors',
        'hover:bg-neutral-100 data-[status=active]:bg-brand data-[status=active]:font-medium data-[status=active]:!text-white',
        // Narrowed, the icon is the whole row and sits in the middle of it.
        'group-data-[rail=shut]:justify-center group-data-[rail=shut]:gap-0',
      )}
      title={item.label}
    >
      <Icon className="size-5 flex-none" strokeWidth={1.9} />
      <span className="rail-label flex-1">{item.label}</span>
      {item.badge && (
        <Tag variant="accent" className="rail-wordy px-1.5 py-px text-2xs">
          {item.badge}
        </Tag>
      )}
    </Link>
  )
}

/**
 * A row inside an opened section. No icon: the section above it carries the
 * one that matters, and a second column of them turns a list of four pages
 * into a wall of pictograms.
 */
export function SidebarSubItem({
  item,
  onNavigate,
}: {
  item: NavItem
  onNavigate: () => void
}) {
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={{ exact: isPortalHome(item.to) }}
      className={cn(
        'relative flex h-(--rail-subrow) items-center rounded-md pl-5 text-sm text-muted-foreground transition-colors',
        // The tick joining this row to the section's own line.
        'before:absolute before:top-1/2 before:left-0 before:h-px before:w-3 before:bg-divider',
        'hover:text-foreground data-[status=active]:font-medium data-[status=active]:!text-brand',
      )}
    >
      <span className="truncate">{item.label}</span>
    </Link>
  )
}
