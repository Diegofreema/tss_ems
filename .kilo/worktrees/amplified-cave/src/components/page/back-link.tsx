import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STYLE = 'mb-3.5 px-1 text-brand'

/**
 * The way off a page that was opened from another one.
 *
 * Every page used to leave by the same fixed door — a student went back to the
 * student register whatever had led to them, so opening one from a class's roll,
 * a parent's children or a search left the office somewhere it had never been
 * and made it find its way again. Where there is a page behind this one, that
 * page is the one to return to.
 *
 * A page opened cold — a shared link, a new tab, a bookmark — has nothing
 * behind it, and only then is the fixed door the right one. It stays a real
 * link there, so it can be opened in a tab of its own like any other.
 */
export function BackLink({
  to,
  label,
  backLabel = 'Back',
}: {
  /** Where to go when there is no page behind this one. */
  to: LinkProps['to']
  /** Names that fallback, so it never reads as a step the office did not take. */
  label: string
  /** What returning is called on a page that is left rather than closed. */
  backLabel?: string
}) {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  if (canGoBack)
    return (
      <Button
        variant="ghost"
        className={STYLE}
        onClick={() => router.history.back()}
      >
        <ChevronLeft className="size-3.5" strokeWidth={2} />
        {backLabel}
      </Button>
    )

  return (
    <Button asChild variant="ghost" className={STYLE}>
      <Link to={to}>
        <ChevronLeft className="size-3.5" strokeWidth={2} />
        {label}
      </Link>
    </Button>
  )
}
