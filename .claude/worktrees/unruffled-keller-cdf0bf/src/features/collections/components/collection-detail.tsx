import { lazy, Suspense } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'
// `toast` goes back in with the buttons commented out below.
import { BackLink } from '@/components/page/back-link'
import { ExternalLink } from '@/components/common/external-link'
import { MissingState } from '@/components/feedback/missing-state'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { SectionHeading } from '@/components/common/section-heading'
import { Tag } from '@/components/common/tag'
import { Rule } from '@/components/page/rule'
import { TileStrip } from '@/components/page/tile-strip'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/hooks/use-confirm'
import { toneForStatus } from '@/lib/status-tone'
import { BLANK } from '../blank'
import type {
  CollectionDef,
  CollectionRoutes,
  DetailFieldSpec,
  DetailTab,
  FlowSpec,
  Row,
} from '../types'
// `fileActionToast` and `isFileAction` go back in with them.
import { useRowAction } from '../use-row-action'
import { cn } from '@/lib/utils'
import { DetailTabPanel } from './detail-tab-panel'

/** Fetched by the record pages that have a body to draw, and by no others. */
const RichTextView = lazy(() =>
  import('@/components/editor/rich-text-view').then((module) => ({
    default: module.RichTextView,
  })),
)

/**
 * The prototype's placeholder, shown where a collection still has no sub-tables
 * of its own. A collection read from the API never gets it: invented rows
 * beside real ones read as records of things that happened, and on the activity
 * log itself they would be fabricated audit entries.
 */
const ACTIVITY: DetailTab = {
  label: 'Activity',
  columns: [
    { key: 'what', label: 'What happened' },
    { key: 'when', label: 'When' },
  ],
  rows: [
    { id: 'ac-1', what: 'Record opened by you', when: 'Today, 09:12' },
    { id: 'ac-2', what: 'Edited by you', when: '18 Nov 2025, 14:03' },
    { id: 'ac-3', what: 'Seen by the school office', when: '15 Nov 2025, 08:40' },
    { id: 'ac-4', what: 'Created', when: '02 Sep 2025, 10:21' },
  ],
}

/** One record: its figures, its sub-tables and its raw fields. */
export function CollectionDetail({
  definition,
  record,
  routes,
  flows,
}: {
  definition: CollectionDef
  /** Undefined where the record was asked for and did not come back. */
  record?: Row
  routes: CollectionRoutes
  flows?: readonly FlowSpec[]
}) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const rowAction = useRowAction(definition, confirm)
  const back = (
    <BackLink
      to={definition.path}
      label={`Back to ${definition.title.toLowerCase()}`}
    />
  )

  // The page is the right page; the data is not there. Saying so in the shell
  // beats the portal's 404, which claims the link itself was wrong.
  if (!record) {
    return (
      <div>
        {back}
        <MissingState
          title={definition.missingTitle ?? 'Record not found'}
          body={definition.missingBody ?? `This ${definition.noun} is not on the register.`}
          action={
            <Button asChild>
              <Link to={definition.path}>Back to {definition.title.toLowerCase()}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const editRoute = definition.readonly ? undefined : routes.edit
  // The same control the register offers, where the office is looking at the
  // one record it applies to.
  const actionLabel = rowAction.spec?.label(record)
  // The same control the register offers on the row, for the one record.
  const rowLink = definition.rowLink
  const linkLabel = rowLink?.label(record)
  const linkButton =
    rowLink && linkLabel ? (
      <Button
        key="row-link"
        variant={definition.readonly ? 'default' : 'outline'}
        onClick={() =>
          void navigate({ to: rowLink.to, search: rowLink.search?.(record) })
        }
      >
        {linkLabel}
      </Button>
    ) : null
  const tabs = (definition.tabs ?? (definition.source ? [] : [ACTIVITY])).filter(
    (tab) => tab.when?.(record.id) ?? true,
  )
  const flowRoute = routes.flow

  // Where a flow is the only thing the page offers, it is the page's main
  // verb. A record can be in more than one — a teacher is given subjects and
  // is written to — and each is offered only where it applies.
  const flowButtons = !flowRoute
    ? []
    : (flows ?? [])
        .filter((one) => (one.allowed?.(record) ?? true) && (one.when?.(record) ?? true))
        .map((one) => (
          <Button
            key={one.name}
            asChild
            variant={definition.readonly ? 'default' : 'outline'}
          >
            <Link
              to={flowRoute}
              params={{ collection: definition.id }}
              search={{ record: record.id, flow: one.name }}
            >
              {one.label}
            </Link>
          </Button>
        ))

  // Same rule as the table: a state the record is not in gets no badge.
  const tagColumns = definition.columns.filter(
    (column) => column.tag && record[column.key] !== BLANK,
  )
  const statColumns = definition.columns
    .filter((column) => column.align === 'right')
    .slice(0, 3)
  // A collection with no `detail` of its own reads back the columns it lists.
  const fields: DetailFieldSpec[] = definition.detail ?? definition.columns

  return (
    <div>
      {back}

      <div className="flex flex-wrap items-start justify-between gap-4.5">
        <div className="max-w-[60ch]">
          <div className="text-2xs uppercase tracking-[0.12em] text-brand-700">
            {definition.kicker} · {definition.title}
          </div>
          <h2 className="mt-2 text-detail-title">{record[definition.nameKey]}</h2>
          {tagColumns.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tagColumns.map((column) => (
                <Tag key={column.key} variant={toneForStatus(record[column.key])}>
                  {record[column.key]}
                </Tag>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          {/* A flow is a decision taken about the record, not an edit of it, so
              a collection nobody can change still offers the one it has. */}
          {definition.readonly ? (
            <>
              {linkButton}
              {flowButtons}
            </>
          ) : !editRoute ? (
            // Commented out until the school decides what it should do — it
            // only raised a toast, and announcing a download that never
            // arrives is worse than offering nothing.
            //
            // <Button
            //   onClick={() =>
            //     toast(
            //       isFileAction(definition.action)
            //         ? fileActionToast(definition.action)
            //         : `${definition.action} — requested`,
            //     )
            //   }
            // >
            //   {definition.action}
            // </Button>
            null
          ) : (
            <>
              <Button
                onClick={() =>
                  navigate({
                    to: editRoute,
                    params: { collection: definition.id, recordId: record.id },
                  })
                }
              >
                <Pencil className="size-3.75" strokeWidth={2} />
                Edit
              </Button>
              {flowButtons}
              {linkButton}
              {actionLabel && (
                <Button variant="outline" onClick={() => rowAction.ask(record)}>
                  {actionLabel}
                </Button>
              )}
              {/* Commented out with the one above: it said "Not wired up
                  yet" out loud, which is not something a record panel should
                  offer.

              <Button variant="outline" onClick={() => toast('Not wired up yet')}>
                {definition.kicker === 'Finance' ? 'Print' : 'Export'}
              </Button>
              */}
            </>
          )}
        </div>
      </div>
      <Rule />

      {statColumns.length > 0 && (
        <TileStrip
          className="mb-7"
          tiles={statColumns.map((column) => ({
            label: column.label,
            value: record[column.key],
          }))}
        />
      )}

      {/* The record reads alone where there are no sub-tables beside it,
          rather than in a narrow column with the space they would have used. */}
      <div
        className={cn(
          'grid gap-8.5',
          tabs.length > 0 && 'lg:grid-cols-[1.6fr_1fr]',
        )}
      >
        <DetailTabPanel tabs={tabs} recordId={record.id} />

        <aside className={tabs.length > 0 ? undefined : 'max-w-[46ch]'}>
          <SectionHeading className="mb-3.5">Record</SectionHeading>
          <div className="border-t-2 border-divider">
            {fields.map((field) =>
              /* A written body is read down the panel rather than across it:
                 a scheme of work in the right-hand half of a label row is a
                 column two words wide. */
              field.rich ? (
                <div
                  key={field.key}
                  className="border-b border-divider px-0.5 py-2.75"
                >
                  <div className="text-2xs uppercase tracking-[0.06em] text-muted-foreground">
                    {field.label}
                  </div>
                  <Suspense fallback={<div className="mt-2 h-6" />}>
                    <RichTextView className="mt-2" html={record[field.key]} />
                  </Suspense>
                </div>
              ) : (
                <div
                  key={field.key}
                  className="flex gap-3.5 border-b border-divider px-0.5 py-2.75"
                >
                  <div className="w-[45%] text-2xs uppercase tracking-[0.06em] text-muted-foreground">
                    {field.label}
                  </div>
                  <div className="flex-1 text-sm tabular-nums">
                    {field.link ? (
                      <ExternalLink href={record[field.key]} />
                    ) : (
                      record[field.key]
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog request={confirm.request} onOpenChange={confirm.setOpen} />
    </div>
  )
}
