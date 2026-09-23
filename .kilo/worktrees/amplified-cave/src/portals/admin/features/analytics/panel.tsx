import type { ReactNode } from 'react'
import { Shimmer } from '@/components/feedback/shimmer'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'

/**
 * A section that can fail on its own.
 *
 * Four endpoints answer this page and any one of them can be down while the
 * rest are fine, so a failure is reported where it happened rather than
 * replacing the page — an office that cannot read the grade comparison can
 * still read what was collected.
 */
export function Panel({
  pending,
  error,
  empty,
  children,
}: {
  pending: boolean
  error: unknown
  /** Shown when the endpoint answered and had nothing to say. */
  empty?: string
  children: ReactNode
}) {
  if (error) {
    return (
      <p className="rounded-lg border border-danger/50 bg-danger-subtle px-4 py-3.5 text-sm text-muted-foreground">
        {errorMessage(error, OFFLINE_MESSAGE)}
      </p>
    )
  }
  if (pending) return <Shimmer className="h-47.5 w-full" />
  if (empty) {
    return <p className="py-6 text-sm text-muted-foreground">{empty}</p>
  }
  return <>{children}</>
}

/** A chart's caption — what the whole series came to, in one line. */
export function Caption({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-muted-foreground">{children}</p>
}
