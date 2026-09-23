import { lazy, Suspense } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { BLANK } from '../blank'
import { hasText, isRichText } from '../rich-text'
import type { AccordionSpec, CollectionRoutes, DetailTab, Row } from '../types'

/** Fetched only where a tab actually holds prose, as the record panel does. */
const RichTextView = lazy(() =>
  import('@/components/editor/rich-text-view').then((module) => ({
    default: module.RichTextView,
  })),
)

/**
 * A tab drawn as panels that open rather than as a table.
 *
 * For rows whose substance is a body somebody wrote — a topic taught, where
 * the columns were a title and as much of the prose as would fit on one line
 * before an ellipsis. That table could not be made to read: the useful column
 * was the one being truncated, and on a phone the whole thing scrolled
 * sideways inside its own frame. Here the title is the whole heading, it
 * wraps, and the prose is read where it was written rather than previewed.
 *
 * The first panel opens on arrival: a register of one topic that has to be
 * clicked before it says anything reads as an empty tab.
 */
export function DetailAccordion({
  rows,
  spec,
  tab,
  recordId,
  routes,
}: {
  rows: Row[]
  spec: AccordionSpec
  tab: DetailTab
  recordId: string
  routes: CollectionRoutes
}) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        {tab.empty ?? 'Nothing to show'}
      </div>
    )
  }

  return (
    <Accordion type="multiple" defaultValue={[rows[0]!.id]}>
      {rows.map((row) => {
        const body = row[spec.body] ?? ''
        const meta = spec.meta ? row[spec.meta] : undefined
        const open = tab.rowRecord?.(recordId, row)

        return (
          <AccordionItem key={row.id} value={row.id}>
            <AccordionTrigger>
              <span className="min-w-0">
                {row[spec.title] || BLANK}
                {meta && meta !== BLANK && (
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {meta}
                  </span>
                )}
              </span>
            </AccordionTrigger>

            <AccordionContent>
              {/* The same field can hold a sentence typed before the editor
                  existed and the HTML written since, so which it is has to be
                  asked rather than assumed either way. */}
              {!hasText(body) ? (
                <p className="text-sm text-muted-foreground">
                  {spec.empty ?? 'Nothing was written here.'}
                </p>
              ) : isRichText(body) ? (
                <Suspense
                  fallback={<div className="h-16 animate-ems-fade rounded-lg bg-ui-line" />}
                >
                  <RichTextView html={body} />
                </Suspense>
              ) : (
                <p className="text-sm whitespace-pre-line">{body}</p>
              )}

              {open && (
                <Link
                  to={routes.record}
                  params={open}
                  className="mt-3.5 inline-block text-sm font-medium text-brand hover:underline"
                >
                  {spec.openLabel ?? 'Open'}
                </Link>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
