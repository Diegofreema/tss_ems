import { useLocation } from '@tanstack/react-router'
import { useLoadedFamily, useParentStore } from '../../parent.store'
import { cn } from '@/lib/utils'

/** Pages that already cover the whole family, so the switcher would mislead. */
const FAMILY_WIDE = ['/parent/children', '/parent/pay', '/parent/timetable']

/** Scopes results, attendance, invoices and assignments to one child. */
export function ChildBar() {
  const { pathname } = useLocation()
  const family = useLoadedFamily()
  const childId = useParentStore((state) => state.childId)
  const selectChild = useParentStore((state) => state.selectChild)

  if (FAMILY_WIDE.some((path) => pathname.startsWith(path))) return null
  // One child is no choice, and none is nothing to choose between.
  if (family.length < 2) return null

  const selected = family.find((child) => child.id === childId) ?? family[0]

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-divider bg-neutral-100 px-6 py-3">
      <div className="text-2xs uppercase tracking-kicker text-muted-foreground">
        Viewing
      </div>
      <div className="flex flex-wrap gap-2">
        {family.map((child) => (
          <button
            key={child.id}
            type="button"
            aria-pressed={child.id === selected.id}
            onClick={() => selectChild(child.id)}
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-md border px-3.5 py-1.75 text-sm transition-colors hover:border-foreground',
              child.id === selected.id
                ? 'border-brand bg-brand/10'
                : 'border-divider bg-raised',
            )}
          >
            <span className="font-heading font-extrabold">{child.name}</span>
            <span className="opacity-70">{child.arm}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
