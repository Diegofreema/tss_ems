import { Link } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'

/**
 * Shown when a page's data fails to load — as a route's error boundary, and by
 * the handful of screens that fetch outside one.
 *
 * The API's own sentence is the body wherever there is one: "No parent record
 * is linked to this account" tells the office something, and "Something went
 * wrong" tells nobody anything.
 */
export function ErrorState({
  error,
  homeTo,
  onRetry,
}: {
  error: unknown
  /** Where "back to dashboard" goes — the portal this reader belongs to. */
  homeTo: string
  onRetry: () => void
}) {
  return (
    <div className="max-w-[560px] py-10">
      <div className="grid size-10 place-items-center rounded-lg bg-danger text-white">
        <TriangleAlert className="size-5.5" strokeWidth={2.2} />
      </div>
      <h2 className="mt-5 text-page-title">This page could not load</h2>
      <p className="mt-2.5 text-sm text-muted-foreground">
        {errorMessage(error, OFFLINE_MESSAGE)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Nothing was changed. Try again, and tell your ICT desk if it keeps
        happening.
      </p>
      <Rule />
      <div className="flex flex-wrap gap-2.5">
        <Button onClick={onRetry}>Try again</Button>
        <Button asChild variant="outline">
          <Link to={homeTo}>Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
