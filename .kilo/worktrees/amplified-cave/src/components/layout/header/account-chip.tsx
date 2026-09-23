import { Link } from '@tanstack/react-router'
import type { AccountSummary } from '@/lib/account'

/**
 * Who is signed in, at the end of the header.
 *
 * A link to their own record rather than a menu: signing out lives at the foot
 * of the rail now, where somebody looking for the way out will look for it,
 * and a popup holding one item is a popup for its own sake.
 */
export function AccountChip({
  account,
  profilePath,
}: {
  account: AccountSummary
  profilePath: string
}) {
  return (
    <Link
      to={profilePath}
      className="flex flex-none items-center gap-2.5 rounded-lg py-1.5 pr-3.5 pl-1.5 transition-colors hover:bg-ui-field sm:bg-ui-field sm:hover:bg-neutral-200"
      title="My profile"
    >
      <span className="grid size-9 flex-none place-items-center rounded-full bg-brand font-heading text-sm font-extrabold text-white">
        {account.initials || '·'}
      </span>
      <span className="hidden min-w-0 sm:block">
        <span className="block truncate text-[15px] font-medium">
          {account.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {account.line}
        </span>
      </span>
    </Link>
  )
}
