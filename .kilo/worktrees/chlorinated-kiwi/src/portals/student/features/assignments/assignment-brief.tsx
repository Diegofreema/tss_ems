import { Link } from '@tanstack/react-router'
import { lazy, type ReactNode, Suspense, useState } from 'react'
import type { AssignmentDetail } from '@/api/assignments/types'
import { Tag } from '@/components/common/tag'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { isRichText } from '@/features/collections/rich-text'
import { toneForStatus } from '@/lib/status-tone'
import { serverNow } from '@/lib/server-clock'
import { assignmentFields, assignmentMeta, windowNote } from './assignment'

/**
 * The reader is the editor with typing turned off, and the editor is a large
 * dependency — so it is fetched only by an assignment whose instructions were
 * actually written with it, and never by the plain ones.
 */
const RichTextView = lazy(() =>
  import('@/components/editor/rich-text-view').then((module) => ({
    default: module.RichTextView,
  })),
)

/**
 * An assignment before it is sat, or once it can no longer be: its terms, its state,
 * and the one thing the student can do about it.
 *
 * The same panel serves all three ways in — start it, you already did, you
 * cannot — because they differ only in the tag at the top and the button at
 * the bottom, and splitting them would be three copies of the same list of
 * terms.
 */
export function AssignmentBrief({
  assignment,
  state,
  note,
  action,
}: {
  assignment: AssignmentDetail
  state: string
  note: string
  action?: ReactNode
}) {
  const title = assignment.assignment?.title?.trim() || 'This assignment'
  const details = assignment.assignment?.details?.trim()
  /*
   * Read once, when the brief is put up, rather than ticking.
   *
   * The school's clock, not the device's — a laptop ten minutes fast would
   * otherwise tell a student their window is shorter than it is. It does not
   * count down: this panel is read in seconds and then left, and the sitting
   * behind it has a live clock of its own. Held in state rather than called
   * during render, which is a side effect dressed as a value.
   */
  const [openedAt] = useState(() => serverNow())
  const shortWindow = windowNote(assignment, openedAt)

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="text-2xs uppercase tracking-kicker text-brand-700">
        Assignment
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="text-page-title">{title}</h2>
        <Tag variant={toneForStatus(state)}>{state}</Tag>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{assignmentMeta(assignment)}</p>
      <Rule />

      {details && (
        <div className="mb-6 border-l-2 border-brand pl-4 text-base leading-relaxed">
          {isRichText(details) ? (
            <Suspense fallback={<div className="h-6 animate-ems-fade" />}>
              <RichTextView html={details} />
            </Suspense>
          ) : (
            <p>{details}</p>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-foreground/60 bg-raised">
        {assignmentFields(assignment).map((field, index) => (
          <div
            key={field.label}
            style={{ animationDelay: `${index * 30}ms` }}
            className="flex animate-ems-row gap-4 border-b border-divider px-5 py-3 last:border-b-0"
          >
            <div className="w-[44%] text-2xs uppercase tracking-label text-muted-foreground">
              {field.label}
            </div>
            <div className="flex-1 text-sm tabular-nums">{field.value}</div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{note}</p>

      {/* Only where the window actually changes what the terms above promise.
          Given the warn colour rather than the muted one because it contradicts
          a figure the student has just read — "Time allowed: 30 minutes" — and
          a correction in the same grey as everything else is a correction
          nobody notices. */}
      {shortWindow && (
        <p className="mt-3 rounded-md border-l-2 border-warn bg-warn-subtle px-3.5 py-2.5 text-sm leading-relaxed text-warn-ink">
          {shortWindow}
        </p>
      )}
      <Rule />

      <div className="flex flex-wrap gap-2.5">
        {action}
        <Button asChild variant="outline">
          <Link to="/student/assignments">Back to my assignments</Link>
        </Button>
      </div>
    </div>
  )
}
