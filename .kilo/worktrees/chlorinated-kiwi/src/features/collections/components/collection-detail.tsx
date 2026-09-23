import { isUnsynced, UNSYNCED_REASON } from '../unsynced'
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
import { hasText } from '../rich-text'
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
  inModal,
}: {
  definition: CollectionDef
  /** Undefined where the record was asked for and did not come back. */
  record?: Row
  routes: CollectionRoutes
  flows?: readonly FlowSpec[]
  /**
   * Drawn inside the record modal rather than as a page: the dialog is its
   * own way back, so no back link, no page-width column, and no sub-tables —
   * a register thin enough for the modal has no real ones to show.
   */
  inModal?: boolean
}) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const rowAction = useRowAction(definition, confirm)
  // What `path` is called. Usually this collection's own register; for one
  // that has none — a topic lives under its subject — the definition says.
  const home = definition.homeLabel ?? definition.title.toLowerCase()
  const back = inModal ? null : (
    <BackLink to={definition.path} label={`Back to ${home}`} />
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
              <Link to={definition.path}>Back to {home}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  /*
   * A record this device wrote and the school has not seen yet cannot be
   * edited: the change would name an id that does not exist. It is a short
   * wait — the create is at the head of the queue — and the panel says so
   * rather than offering a button that would save into nothing.
   */
  const waiting = isUnsynced(record)
  const editRoute = definition.readonly || waiting ? undefined : routes.edit
  // The same control the register offers, where the office is looking at the
  // one record it applies to.
  const actionLabel = rowAction.spec?.label(record)
  // The same control the register offers on the row, for the one record.
  const rowLink = definition.rowLink
  // Withheld while the record is still in the queue, like everything else on
  // this page: the link carries the record's id to a page that asks the school
  // about it, and the school has not issued one.
  const linkLabel = waiting ? undefined : rowLink?.label(record)
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
  /*
   * A record still in the queue has no tabs.
   *
   * Every one of them is a request naming this record's id — a student's fee
   * ledger, their results, the activity filed against them — and the id is
   * `local:<uuid>`, which the school has never issued. The panel answered
   * "No API endpoint matches GET /students/local:7ec2…/invoices", which is a
   * true sentence about a question nobody should have asked.
   *
   * The register withholds the door for the same reason (`canOpen` in
   * `collection-list.tsx`); this is the far end of it, for a reader who has
   * the address anyway — a reload, the back button, a bookmark.
   */
  const tabs =
    inModal || waiting
      ? []
      : (definition.tabs ?? (definition.source ? [] : [ACTIVITY])).filter(
          (tab) => tab.when?.(record.id) ?? true,
        )
  const flowRoute = routes.flow

  // Where a flow is the only thing the page offers, it is the page's main
  // verb. A record can be in more than one — a teacher is given subjects and
  // is written to — and each is offered only where it applies. None is offered
  // on a record still in the queue: allocating a fee or setting privileges
  // writes against an id the school has never issued.
  const flowButtons = !flowRoute || waiting
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
  /*
   * And the figures above them, for the same reason: a tile reading "—" over a
   * record is the loudest way this page had of looking like it had lost
   * something. A register's summary tiles keep their dash on purpose — there,
   * it means a figure that could not be worked out, which is worth saying —
   * but a record simply does not carry every column the list does.
   */
  const statColumns = definition.columns
    .filter((column) => column.align === 'right' && filled(record[column.key]))
    .slice(0, 3)
  // A collection with no `detail` of its own reads back the columns it lists.
  const listed: DetailFieldSpec[] = definition.detail ?? definition.columns
  /*
   * A field this record has nothing for is left out, rather than drawn as a
   * label beside a dash.
   *
   * The panel lists what a record *can* hold, and these endpoints fill very
   * little of it: a class charging no fees, a subject taught by nobody yet, a
   * student enrolled before the office collected a religion. Every one of
   * those drew a row reading "—", and a dozen of them together read as data
   * that had gone missing rather than as a record that is simply shorter than
   * the form behind it.
   *
   * Per record rather than per collection, deliberately. A label is only dead
   * where the endpoint can never fill it, and none of these can be shown to be
   * — the same field is blank on bronze's sparse records and filled on a real
   * school's. Dropping the label outright would take it from the records that
   * do have it. See also the tags above, which have skipped a blank the same
   * way since the register was written.
   */
  const fields = listed.filter((field) =>
    field.rich ? hasText(record[field.key] ?? '') : filled(record[field.key]),
  )

  return (
    // A record with no sub-tables reads as one centred column — header, tiles
    // and fields together — instead of hugging the left edge of a page it
    // cannot fill. With tabs it spreads to the shell's full width; in the
    // modal, the dialog is already the column.
    <div
      className={cn(
        !inModal && tabs.length === 0 && 'mx-auto w-full max-w-[720px]',
      )}
    >
      {back}

      {/* In the modal the dialog's X owns the top-right corner, so the header
          stops short of it rather than wrapping a button underneath. */}
      <div
        className={cn(
          'flex flex-wrap items-start justify-between gap-4.5',
          inModal && 'pr-9',
        )}
      >
        <div className="max-w-[60ch]">
          <div className="text-2xs uppercase tracking-kicker text-brand-700">
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
          {waiting ? (
            <p className="max-w-140 text-xs text-muted-foreground">{UNSYNCED_REASON}</p>
          ) : definition.readonly ? (
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

      {/* The record reads alone where there are no sub-tables beside it —
          filling the centred column above rather than a narrower one inside it. */}
      <div
        className={cn(
          'grid gap-8.5',
          tabs.length > 0 && '@3xl/page:grid-cols-[1.6fr_1fr]',
        )}
      >
        <DetailTabPanel tabs={tabs} recordId={record.id} routes={routes} />

        <aside>
          <SectionHeading className="mb-3.5">Record</SectionHeading>
          {fields.length === 0 ? (
            /* Every field was empty. Saying so beats an empty bordered box,
               which reads as a panel that failed to load. */
            <p className="border-t border-divider-strong py-3 text-sm text-muted-foreground">
              The school holds nothing else about this {definition.noun} yet.
            </p>
          ) : (
          <div className="border-t border-divider-strong">
            {fields.map((field) =>
              /* A written body is read down the panel rather than across it:
                 a scheme of work in the right-hand half of a label row is a
                 column two words wide. */
              field.rich ? (
                <div
                  key={field.key}
                  className="border-b border-divider px-0.5 py-2.75"
                >
                  <div className="text-2xs uppercase tracking-label text-muted-foreground">
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
                  <div className="w-[45%] text-2xs uppercase tracking-label text-muted-foreground">
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
          )}
        </aside>
      </div>

      <ConfirmDialog request={confirm.request} onOpenChange={confirm.setOpen} />
    </div>
  )
}

/**
 * Whether the record actually carries this field.
 *
 * `BLANK` is the dash every row mapper writes where the API sent nothing, so
 * it counts as empty here — that is the whole point. An honest "0" does not:
 * a class with no arms yet is a fact worth reading.
 */
function filled(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== '' && value.trim() !== BLANK
}
