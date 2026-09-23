import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs'
import { collectFeeKeys } from '@/api/collect-fees/keys'
import { collectFeesService } from '@/api/collect-fees/service'
import { BackLink } from '@/components/page/back-link'
import { SegmentedControl } from '@/components/common/segmented-control'
import { DataTable } from '@/components/data-table/data-table'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { FilterBar } from '@/components/page/filter-bar'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { TileStrip } from '@/components/page/tile-strip'
import { Button } from '@/components/ui/button'
import { toTableColumns } from '@/features/collections/components/collection-columns'
import type { Row } from '@/features/collections/types'
import { useDebounced } from '@/hooks/use-debounced'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import {
  ledgerRow,
  pupilHeading,
  pupilResult,
  pupilSubtitle,
  pupilTiles,
} from './pupil'

const RESULTS = toTableColumns([
  { key: 'name', label: 'Pupil', cardRole: 'title' },
  { key: 'regno', label: 'Reg. no.', cardRole: 'subtitle' },
  { key: 'placed', label: 'Class' },
])

const LEDGER = toTableColumns([
  { key: 'invoice', label: 'Invoice', cardRole: 'subtitle' },
  { key: 'fee', label: 'Fee', cardRole: 'title' },
  { key: 'session', label: 'Session' },
  { key: 'billed', label: 'Amount', align: 'right' },
  { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
])

const SCOPES = ['session', 'all'] as const
type Scope = (typeof SCOPES)[number]

const rowKey = (row: Row) => row.id

/**
 * Everything one pupil has been billed, settled or not.
 *
 * The counter queue answers "who owes what" and cannot see a pupil who owes
 * nothing or a payment already taken. This is where a family's history is, and
 * it is the only way to reach a receipt for a payment that has been made.
 */
export function PupilLookupPage() {
  const [query, setQuery] = useQueryState('q', parseAsString.withDefault(''))
  const [pupil, setPupil] = useQueryState('pupil', parseAsString.withDefault(''))
  const [scope, setScope] = useQueryState(
    'scope',
    parseAsStringLiteral(SCOPES).withDefault('session'),
  )

  const header = (
    <>
      <BackLink to="/admin/collect" label="Back to fee collection" />
      <PageHeader
        kicker="Finance · Fee collection"
        title="Find a pupil"
        description="Everything one pupil has been billed, settled or not. The queue lists only what is owed — a family's history and their receipts are here."
      />
      <Rule />
    </>
  )

  return (
    <div className="max-w-[900px]">
      {header}
      {pupil ? (
        <>
          <Button
            variant="outline"
            className="mb-[22px]"
            onClick={() => void setPupil(null)}
          >
            Search for someone else
          </Button>
          <PupilLedger
            pupilId={pupil}
            scope={scope}
            onScope={(next) => void setScope(next)}
          />
        </>
      ) : (
        <PupilSearch
          query={query}
          onQuery={(value) => void setQuery(value || null)}
          onPick={(id) => void setPupil(id)}
        />
      )}
    </div>
  )
}

function PupilSearch({
  query,
  onQuery,
  onPick,
}: {
  query: string
  onQuery: (value: string) => void
  onPick: (id: string) => void
}) {
  // The endpoint answers 422 without a term, so nothing is asked until one is
  // typed — and then only once the typing stops.
  const term = useDebounced(query)
  const { data, isPending, error, refetch } = useQuery({
    queryKey: collectFeeKeys.studentSearch({ q: term }),
    queryFn: () => collectFeesService.findStudents({ q: term }),
    enabled: Boolean(term),
  })

  return (
    <>
      <FilterBar
        query={query}
        onQueryChange={onQuery}
        placeholder="Search pupil name or reg. no."
        count={data ? `${data.length} found` : ''}
      />

      {!term ? (
        <EmptyState
          title="Search for a pupil"
          body="Type a name or a registration number. Pupils who owe nothing are found here too."
        />
      ) : error ? (
        <EmptyState
          title="That search could not run"
          body={errorMessage(error, OFFLINE_MESSAGE)}
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      ) : isPending ? (
        <TableSkeleton rows={4} />
      ) : data.length === 0 ? (
        <EmptyState
          title={`Nobody matches “${term}”`}
          body="Check the spelling, or try the registration number instead of the name."
        />
      ) : (
        <DataTable
          columns={RESULTS}
          rows={data.map(pupilResult)}
          rowKey={rowKey}
          onRowClick={(row) => onPick(row.id)}
          compact
        />
      )}
    </>
  )
}

function PupilLedger({
  pupilId,
  scope,
  onScope,
}: {
  pupilId: string
  scope: Scope
  onScope: (next: Scope) => void
}) {
  const navigate = useNavigate()
  const { data, isPending, error, refetch } = useQuery({
    queryKey: collectFeeKeys.ledger(pupilId, scope === 'all'),
    queryFn: () => collectFeesService.studentLedger(pupilId, scope === 'all'),
    // Widening to every session keeps the pupil's name and figures on screen
    // rather than dropping the whole panel back to a skeleton for one request.
    placeholderData: keepPreviousData,
  })

  if (error) {
    return (
      <EmptyState
        title="That pupil could not be loaded"
        body={errorMessage(error, OFFLINE_MESSAGE)}
        action={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    )
  }
  if (isPending) return <TableSkeleton rows={5} />

  const { student, invoices } = data

  return (
    <>
      <div className="mb-[18px]">
        <h2 className="text-detail-title">{pupilHeading(student)}</h2>
        <div className="mt-1.5 text-[12.5px] text-muted-foreground">
          {pupilSubtitle(student)}
        </div>
      </div>

      <TileStrip className="mb-5" tiles={pupilTiles(invoices)} />

      <SegmentedControl<Scope>
        name="scope"
        className="mb-[18px]"
        value={scope}
        onChange={onScope}
        options={[
          { value: 'session', label: 'This session' },
          { value: 'all', label: 'Every session' },
        ]}
      />

      <DataTable
        columns={LEDGER}
        rows={invoices.map(ledgerRow)}
        rowKey={rowKey}
        action={{
          // One button, two jobs. An invoice still owing goes to the payment
          // flow; a payment already recorded goes to its slip. An invoice
          // settled before the counter kept transactions has neither — it gets
          // no button rather than one that answers 404.
          label: (row) =>
            row.payable ? 'Take payment' : row.receipt ? 'Receipt' : undefined,
          onSelect: (row) =>
            void navigate(
              row.payable
                ? {
                    to: '/admin/$collection/action',
                    params: { collection: 'collect' },
                    search: { record: row.payable },
                  }
                : {
                  to: '/admin/collect/receipt/$invoiceId',
                  params: { invoiceId: row.receipt },
                },
            ),
        }}
        compact
      />

      <div className="mt-2.5 text-[12.5px] text-muted-foreground">
        {invoices.length === 0
          ? scope === 'all'
            ? 'Nothing has ever been billed to this pupil.'
            : 'Nothing has been billed to this pupil this session.'
          : `${invoices.length} ${invoices.length === 1 ? 'invoice' : 'invoices'}, newest first`}
      </div>
    </>
  )
}
