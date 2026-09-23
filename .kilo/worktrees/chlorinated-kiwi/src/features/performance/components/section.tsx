import type { ReactNode } from 'react'
import { Shimmer } from '@/components/feedback/shimmer'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'

/**
 * A block of a performance page that can fail, or be empty, on its own.
 *
 * Every one of these endpoints answers its own empty case in a sentence — no
 * marks entered, none approved yet, too few students to correlate — and that
 * sentence is the most useful thing on most of these responses today. So an
 * empty block shows the school's own words rather than a chart of zeroes,
 * which is the one wrong answer these pages could give.
 */
export function Section({
  pending,
  error,
  note,
  children,
}: {
  pending: boolean
  error: unknown
  /** The endpoint's own `message`, shown when there is nothing to draw. */
  note?: string | null
  children: ReactNode
}) {
  if (error) {
    return (
      <p className="rounded-lg border border-danger/50 bg-danger-subtle px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
        {errorMessage(error, OFFLINE_MESSAGE)} These figures are worked out by
        the school from every mark and register it holds, so they need a
        connection — there is nothing on this device to fall back to.
      </p>
    )
  }
  if (pending) return <Shimmer className="h-47.5 w-full rounded-xl" />
  if (note) {
    return (
      <p className="rounded-lg border border-divider bg-raised px-4 py-3.5 text-sm leading-relaxed text-muted-foreground shadow-card">
        {note}
      </p>
    )
  }
  return <>{children}</>
}

/** The sentence a page shows under a figure it wants read carefully. */
export function Footnote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{children}</p>
  )
}

/**
 * The duplicates the endpoint had to settle: two marks for one student, subject
 * and term. It keeps the newest and lists the clash — which is somebody's job
 * to sort out, so it is said out loud rather than buried.
 */
export function DuplicateNotice({ count }: { count: number }) {
  if (count < 1) return null
  return (
    <p className="mt-4 rounded-lg border border-danger/40 bg-danger-subtle px-4 py-3 text-xs leading-relaxed text-muted-foreground">
      {count === 1
        ? 'One mark is filed twice for the same student, subject and term.'
        : `${count} marks are filed twice for the same student, subject and term.`}{' '}
      The newest of each was counted here and the rest ignored. Settle them on
      Results so the report sheet and this page cannot disagree.
    </p>
  )
}

/**
 * Marks on file that nobody has approved.
 *
 * They are counted rather than dropped, which is the honest thing — "nothing
 * to show" and "nothing approved to show" are different sentences, and only
 * one of them tells a teacher what to do next.
 */
export function PendingNotice({
  count,
  including,
}: {
  count: number
  /** Whether the reader has asked to see the provisional picture. */
  including: boolean
}) {
  if (count < 1) return null
  return (
    <p className="mt-4 rounded-lg border border-divider bg-raised px-4 py-3 text-xs leading-relaxed text-muted-foreground shadow-card">
      {including
        ? `${count} mark${count === 1 ? '' : 's'} on file ${count === 1 ? 'has' : 'have'} not been approved. ${count === 1 ? 'It is' : 'They are'} included here, so these figures are provisional and will not match the report sheet.`
        : `${count} mark${count === 1 ? '' : 's'} on file ${count === 1 ? 'has' : 'have'} not been approved, so ${count === 1 ? 'it is' : 'they are'} left out — this matches the report sheet. Approve them on Results, or show the provisional picture above.`}
    </p>
  )
}
