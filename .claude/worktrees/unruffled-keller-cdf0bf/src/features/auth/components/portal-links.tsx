import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { PORTALS } from '../role'

/** The four portals, listed when an account opened the wrong one. */
export function PortalLinks() {
  return (
    <div className="mt-5 border-t-2 border-divider">
      {PORTALS.map((portal) => (
        <Link
          key={portal.to}
          to={portal.to}
          className="flex items-center gap-3 border-b border-divider px-1 py-3.5 text-sm !text-foreground no-underline transition-[background-color,padding-left] duration-150 hover:bg-neutral-100 hover:pl-2.5"
        >
          <span className="flex-1">{portal.label}</span>
          <span className="text-xs text-muted-foreground">{portal.hint}</span>
          <ChevronRight className="size-[15px]" strokeWidth={2} />
        </Link>
      ))}
    </div>
  )
}
