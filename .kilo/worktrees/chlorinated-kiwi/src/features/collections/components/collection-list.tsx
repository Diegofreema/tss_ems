import { Link, useNavigate } from '@tanstack/react-router'
// `Download` and `toast` go back in with the buttons commented out below.
import { ArrowUpRight, Plus, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { EmptyState } from '@/components/feedback/empty-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { DataTable } from '@/components/data-table/data-table'
import { Pagination } from '@/components/data-table/pagination'
import { FilterBar } from '@/components/page/filter-bar'
import { PageHeader } from '@/components/page/page-header'
import { Panel } from '@/components/page/panel'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/hooks/use-confirm'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { CollectionDef, CollectionRoutes, FlowSpec, Row } from '../types'
import { primaryActionKind } from '../primary-action'
import { canChange, isUnsynced } from '../unsynced'
import { useCollectionRows } from '../use-collection-rows'
import { useRemoveRecord } from '../use-remove-record'
import { useRowAction } from '../use-row-action'
import { filledColumns } from '../columns'
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
        // The same reading the confirm gets, so the menu item and the dialog
        // it opens are the same colour. `tone` is undefined on most specs and
        // means danger there — see `RowActionSpec`.
        danger: (row: Row) => (rowAction.spec?.tone?.(row) ?? 'danger') === 'danger',
      }
    : rowLink
      ? {
          /*
           * Withheld for a record still in the queue, the same as a row action
           * is (`use-row-action.ts`), and here rather than in each definition
           * so nobody has to remember: the link carries this row's id to a page
           * that asks the school about it, and a `local:` id is not one the
           * school can answer for.
           */
          label: (row: Row) => (isUnsynced(row) ? undefined : rowLink.label(row)),
          onSelect: (row: Row) =>
            void navigate({ to: rowLink.to, search: rowLink.search?.(row) }),
          // A link takes nothing away; it is the page it lands on that decides.
          danger: () => false,
          icon: ArrowUpRight,
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
      <Panel>
        <PageHeader
          kicker={definition.kicker}
          title={definition.title}
          description={definition.description}
        />
        <EmptyState
          title="This list could not load"
          body={error ? errorMessage(error, OFFLINE_MESSAGE) : OFFLINE_MESSAGE}
          action={<Button onClick={retry}>Try again</Button>}
        />
      </Panel>
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
  // Every flow that opens without a record gets a button: the first is the
  // page's primary action and wears its label, the rest stand beside it in
  // outline — the library issues a book and adds a title from the same strip.
  const listFlows = (flows ?? []).filter(
    (one) => one.fromList && (one.allowed?.() ?? true),
  )
  const listFlow = listFlows[0]
  // Held as a `const` rather than read off `routes` at each use: a property
  // narrowed by the guard below goes back to "or undefined" inside the `.map`
  // callback that draws the rest of the flows, and `to` may not be undefined.
  const flowRoute = routes.flow
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
  //       <Download className="size-3.75" strokeWidth={2} />
  //       {definition.action}
  //     </Button>
  //   ) : ...
  //
  //   <Button onClick={() => toast(`${definition.action} — requested`)}>
  //     {definition.action}
  //   </Button>
  const primaryAction =
    primary === 'flow' && flowRoute && listFlow ? (
      <Button asChild>
        <Link
          to={flowRoute}
          params={{ collection: definition.id }}
          search={{ flow: listFlow.name }}
        >
          {definition.action}
        </Link>
      </Button>
    ) : primary === 'create' && routes.create ? (
      <Button asChild>
        <Link to={routes.create} params={{ collection: definition.id }}>
          <Plus className="size-3.75" strokeWidth={2} />
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

  const moreFlows =
    primary === 'flow' && flowRoute
      ? listFlows.slice(1).map((one) => (
          <Button key={one.name} asChild variant="outline">
            <Link
              to={flowRoute}
              params={{ collection: definition.id }}
              search={{ flow: one.name }}
            >
              {one.label}
            </Link>
          </Button>
        ))
      : []

  const actions =
    definition.secondaryTo || moreFlows.length > 0 ? (
      <div className="flex flex-wrap gap-2.5">
        {primaryAction}
        {moreFlows}
        {definition.secondaryTo && (
          <Button asChild variant="outline">
            <Link to={definition.secondaryTo.to}>{definition.secondaryTo.label}</Link>
          </Button>
        )}
      </div>
    ) : (
      primaryAction
    )

  return (
    <Panel className="p-5 sm:p-6">
      <PageHeader
        kicker={definition.kicker}
        title={definition.title}
        description={definition.description}
        action={actions}
      />
      <div className="mt-5" />

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
              columns={toTableColumns(filledColumns(definition.columns, paged.rows))}
              rows={paged.rows}
              rowKey={(row) => row.id}
              onRowClick={(row) =>
                // A thin record opens over this list rather than as a page;
                // the search param is the modal's whole state.
                definition.modal
                  ? navigate({ to: definition.path, search: { record: row.id } })
                  : navigate({ to: routes.record, params: params(row) })
              }
              onEdit={
                editRoute
                  ? (row) => navigate({ to: editRoute, params: params(row) })
                  : undefined
              }
              // A record this device wrote and the school has not seen is
              // read-only until it sends — the phone card layout offers Edit
              // per row, so it is told which rows may take one. The desktop
              // table offers no inline edit; its rows open the record, which
              // withholds the control itself.
              // A record this device wrote has no page at the school to open:
              // every panel behind it — a student's fees, their results — is a
              // request naming an id the school has never issued, and each one
              // came back as "No API endpoint matches GET
              // /students/local:7ec2…/invoices". So the row does not open at
              // all until the queue has sent it, which is the same rule as
              // `canEdit` below arriving at the same place from the other
              // direction: nothing can be built on a record until it is real.
              canOpen={(row) => !isUnsynced(row)}
              canEdit={(row) => canChange(row)}
              // Only where the API can actually delete. Without a `remove` the
              // row used to offer Delete and answer with a toast saying the
              // record was gone, which it never was.
              onDelete={editRoute && (definition.remove || definition.queueRemove) ? askDelete : undefined}
              // A register may mix records only some of which this account can
              // delete — teaching records beside office ones. A record this
              // device wrote and the school has not seen yet is off limits to
              // everybody until it sends; see `unsynced.ts`.
              canDelete={(row) => canChange(row, definition.removeWhen)}
              action={rowControl}
              openLabel={`Open the ${definition.noun}`}
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
    </Panel>
  )
}
