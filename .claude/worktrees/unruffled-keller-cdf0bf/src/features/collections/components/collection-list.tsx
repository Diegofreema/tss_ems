import { Link, useNavigate } from '@tanstack/react-router'
// `Download` and `toast` go back in with the buttons commented out below.
import { Plus, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { EmptyState } from '@/components/feedback/empty-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { DataTable } from '@/components/data-table/data-table'
import { Pagination } from '@/components/data-table/pagination'
import { FilterBar } from '@/components/page/filter-bar'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/hooks/use-confirm'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { CollectionDef, CollectionRoutes, FlowSpec, Row } from '../types'
import { primaryActionKind } from '../primary-action'
import { useCollectionRows } from '../use-collection-rows'
import { useRemoveRecord } from '../use-remove-record'
import { useRowAction } from '../use-row-action'
import { toTableColumns } from './collection-columns'
import { CollectionFilters } from './collection-filters'
import { CollectionSummary } from './collection-summary'

export function CollectionList({
  definition,
  routes,
  flows,
}: {
  definition: CollectionDef
  routes: CollectionRoutes
  /** The guided flows these records enter, when the portal has any for them. */
  flows?: readonly FlowSpec[]
}) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const rowAction = useRowAction(definition, confirm)

  /*
   * The row's one control: whichever of the two the collection declared. A
   * write wins over a link, because a register that somehow had both would
   * otherwise offer the link and swallow the write.
   */
  const rowLink = definition.rowLink
  const rowControl = rowAction.spec
    ? {
        label: rowAction.spec.label,
        onSelect: rowAction.ask,
        pending: rowAction.pending,
      }
    : rowLink
      ? {
          label: rowLink.label,
          onSelect: (row: Row) =>
            void navigate({ to: rowLink.to, search: rowLink.search?.(row) }),
        }
      : undefined
  const remove = useRemoveRecord(definition)
  const {
    text, query, filters, page, pending, setQuery, setFilter, setPage,
    total, paged, error, paused, retry, tally, filtered, clear,
  } = useCollectionRows(definition)

  // A list that cannot load says so rather than shimmering forever — because
  // the endpoint refused, or because the request is held back as offline and
  // may never go. Only with nothing on screen: a failed page turn keeps the
  // rows already there.
  if (!paged && (error || paused)) {
    return (
      <>
        <PageHeader
          kicker={definition.kicker}
          title={definition.title}
          description={definition.description}
        />
        <Rule />
        <EmptyState
          title="This list could not load"
          body={error ? errorMessage(error, OFFLINE_MESSAGE) : OFFLINE_MESSAGE}
          action={<Button onClick={retry}>Try again</Button>}
        />
      </>
    )
  }

  // The one moment with nothing to show: before the first answer. Every later
  // one keeps the rows it has, so this is the only skeleton a reader sees.
  if (!paged) return <ListSkeleton label={definition.title.toLowerCase()} />

  const params = (row: Row) => ({
    collection: definition.id,
    recordId: row.id,
  })

  const askDelete = (row: Row) =>
    confirm.ask({
      title: `Delete this ${definition.noun}?`,
      body: definition.removeBody?.(row) ?? 'This removes the record from the register. Anything already raised against it stays in the audit log.',
      subject: row[definition.nameKey],
      cta: `Delete the ${definition.noun}`,
      // Handed back rather than fired, so the dialog holds with its button
      // spinning until the API has actually answered.
      onConfirm: () => remove.mutateAsync(row.id),
    })

  // One decision, shared with the create route so a list that does not create
  // records has no create page to reach by URL either.
  const primary = primaryActionKind(definition, routes, flows)
  // At most one flow opens without a record, and it is the one the button on
  // this page is for.
  const listFlow = flows?.find((one) => one.fromList)
  // One decision, taken in `primaryActionKind`. A second `readonly` gate here
  // used to overrule the destination such a collection had named.
  //
  // 'file' and 'placeholder' draw nothing for now. Both only raised a toast,
  // and a button that announces a download and then hands over no file is
  // worse than no button at all. `primaryActionKind` still returns them, so
  // restoring one is uncommenting its branch:
  //
  //   primary === 'file' ? (
  //     <Button onClick={() => toast(fileActionToast(definition.action))}>
  //       <Download className="size-[15px]" strokeWidth={2} />
  //       {definition.action}
  //     </Button>
  //   ) : ...
  //
  //   <Button onClick={() => toast(`${definition.action} — requested`)}>
  //     {definition.action}
  //   </Button>
  const primaryAction =
    primary === 'flow' && routes.flow && listFlow ? (
      <Button asChild>
        <Link
          to={routes.flow}
          params={{ collection: definition.id }}
          search={{ flow: listFlow.name }}
        >
          {definition.action}
        </Link>
      </Button>
    ) : primary === 'create' && routes.create ? (
      <Button asChild>
        <Link to={routes.create} params={{ collection: definition.id }}>
          <Plus className="size-[15px]" strokeWidth={2} />
          {definition.action}
        </Link>
      </Button>
    ) : primary === 'link' && definition.actionTo ? (
      <Button asChild>
        <Link to={definition.actionTo}>{definition.action}</Link>
      </Button>
    ) : null

  // A readonly collection has no edit route of its own, so its rows offer
  // neither pencil nor bin.
  const editRoute = definition.readonly ? undefined : routes.edit

  const actions = definition.secondaryTo ? (
    <div className="flex flex-wrap gap-2.5">
      {primaryAction}
      <Button asChild variant="outline">
        <Link to={definition.secondaryTo.to}>{definition.secondaryTo.label}</Link>
      </Button>
    </div>
  ) : (
    primaryAction
  )

  return (
    <>
      <PageHeader
        kicker={definition.kicker}
        title={definition.title}
        description={definition.description}
        action={actions}
      />
      <Rule />

      {/* A search or a filter that matches nothing is the table's own state to
          show, not the collection's — an empty register is a different thing
          entirely, and only an unnarrowed list can tell you it is empty. */}
      {total === 0 ? (
        <EmptyState
          title={definition.emptyTitle}
          body={definition.emptyBody}
          action={primaryAction}
        />
      ) : (
        <>
          <FilterBar
            query={text}
            onQueryChange={setQuery}
            placeholder={definition.searchHint}
            searchable={definition.searchable ?? true}
            count={
              total === undefined
                ? `${paged.total} found`
                : `${paged.total} of ${total}`
            }
          >
            {definition.filters && (
              <CollectionFilters
                specs={definition.filters}
                filters={filters}
                onChange={setFilter}
              />
            )}
            {/* Only once something is narrowing the list — a control that
                undoes nothing is one more thing to read past. */}
            {filtered && (
              <Button variant="ghost" size="sm" onClick={clear}>
                <X className="size-3.5" strokeWidth={2} />
                Clear
              </Button>
            )}
          </FilterBar>

          <CollectionSummary definition={definition} tally={tally} />

          {/* Dimmed rather than replaced: the rows on screen are the last
              answer, still true until the next one arrives. */}
          <div
            aria-busy={pending}
            className={cn(
              'transition-opacity duration-200',
              pending && 'pointer-events-none opacity-55',
            )}
          >
            <DataTable
              columns={toTableColumns(definition.columns)}
              rows={paged.rows}
              rowKey={(row) => row.id}
              onRowClick={(row) =>
                navigate({ to: routes.record, params: params(row) })
              }
              onEdit={
                editRoute
                  ? (row) => navigate({ to: editRoute, params: params(row) })
                  : undefined
              }
              // Only where the API can actually delete. Without a `remove` the
              // row used to offer Delete and answer with a toast saying the
              // record was gone, which it never was.
              onDelete={editRoute && definition.remove ? askDelete : undefined}
              // A register may mix records only some of which this account can
              // delete — teaching records beside office ones.
              canDelete={definition.removeWhen}
              action={rowControl}
              searchQuery={query}
              onClearSearch={() => setQuery('')}
            />
          </div>

          <Pagination
            page={page}
            paged={paged}
            footer={definition.footer}
            onPageChange={setPage}
          />
        </>
      )}

      <ConfirmDialog request={confirm.request} onOpenChange={confirm.setOpen} />
    </>
  )
}
