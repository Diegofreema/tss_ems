import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { CrumbLink } from '@/features/collections/types'
import { cn } from '@/lib/utils'
import { useShellStore } from '@/stores/shell.store'
import { ThemeToggle } from './theme-toggle'

const CRUMB = 'truncate text-2xs uppercase tracking-[0.12em] text-muted-foreground'

/**
 * Sticky bar: breadcrumb over page title on the left, portal status and the
 * bell/theme controls on the right.
 */
export function AppHeader({
  crumb,
  crumbTo,
  title,
  status,
  narrow,
  children,
}: {
  crumb: string
  /** Where the crumb leads. Text where the crumb names no page of its own. */
  crumbTo?: CrumbLink
  title: string
  status?: ReactNode
  narrow: boolean
  /** Portal-agnostic slot for the notification bell. */
  children?: ReactNode
}) {
  const openDrawer = useShellStore((state) => state.openDrawer)

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3.5 border-b border-divider bg-background px-content py-3.5">
      {narrow && (
        <Button
          variant="outline"
          size="icon"
          onClick={openDrawer}
          aria-label="Open the menu"
          className="size-9"
        >
          <Menu className="size-[17px]" strokeWidth={2} />
        </Button>
      )}

      {/* One line each: a long record name would otherwise wrap into the
          status beside it. The page below repeats the title in full. */}
      <div className="min-w-0 flex-1">
        {/* A crumb that names a page is the way up to it; one that names only
            the section it sits in has nowhere to lead, and stays text. */}
        {crumbTo ? (
          <Link
            {...crumbTo}
            className={cn(CRUMB, 'block w-fit max-w-full hover:text-brand')}
          >
            {crumb}
          </Link>
        ) : (
          <div className={CRUMB}>{crumb}</div>
        )}
        <div className="truncate font-heading text-lg leading-[1.15] font-extrabold">
          {title}
        </div>
      </div>

      {/* Below the design's phone breakpoint there is no room for both, and
          the title is what tells you which page you are on. */}
      {status && (
        <div className="hidden flex-none text-right text-2xs text-muted-foreground sm:block">
          {status}
        </div>
      )}

      {children}
      <ThemeToggle />
    </header>
  )
}
