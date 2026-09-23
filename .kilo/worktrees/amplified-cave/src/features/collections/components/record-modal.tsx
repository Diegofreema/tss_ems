import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/feedback/empty-state'
import { Shimmer } from '@/components/feedback/shimmer'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import type { CollectionDef, CollectionRoutes, FlowSpec } from '../types'
import { resolveRecord } from '../resolve'
import { CollectionDetail } from './collection-detail'

/**
 * A thin record, opened over its own register rather than as a page. The URL
 * carries it as `?record=`, so a record still deep-links, a refresh keeps it
 * open, and the back button closes it — everything a page gave, without a page
 * that was mostly empty. On a phone it takes the whole screen instead.
 */
export function RecordModal({
  definition,
  routes,
  flows,
}: {
  definition: CollectionDef
  routes: CollectionRoutes
  flows?: readonly FlowSpec[]
}) {
  const navigate = useNavigate()
  const { record: recordId } = useSearch({ strict: false }) as {
    record?: string
  }
  const open = Boolean(recordId)

  const query = useQuery({
    queryKey: ['record-modal', definition.id, definition.scope ?? '', recordId],
    // `null` where the API has no such record: react-query treats an undefined
    // answer as a bug, and the missing state needs "looked, not there" kept
    // apart from "still looking".
    queryFn: async () => (await resolveRecord(definition, recordId ?? '')) ?? null,
    enabled: open,
  })

  // Dropping the search param is what closes the modal, so Escape, the X and
  // the scrim all leave a clean list URL behind them.
  const close = () => void navigate({ to: definition.path, search: {} })

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent
        aria-describedby={undefined}
        className="top-0 left-0 block h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none p-content sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[85dvh] sm:w-full sm:max-w-[760px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-7"
      >
        {/* The record panel draws its own heading; this one is for the screen
            reader the visual heading does not announce a dialog to. */}
        <DialogTitle className="sr-only">
          {query.data?.[definition.nameKey] ?? `One ${definition.noun}`}
        </DialogTitle>

        {query.isError ? (
          <EmptyState
            title="This record could not load"
            body={errorMessage(query.error, OFFLINE_MESSAGE)}
            action={<Button onClick={() => void query.refetch()}>Try again</Button>}
          />
        ) : query.isPending && open ? (
          <div className="py-2">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="mt-3.5 h-8.5 w-56" />
            <div className="mt-7 flex flex-col gap-3">
              <Shimmer className="h-9" />
              <Shimmer className="h-9" />
              <Shimmer className="h-9" />
            </div>
          </div>
        ) : (
          <CollectionDetail
            definition={definition}
            record={query.data ?? undefined}
            routes={routes}
            flows={flows}
            inModal
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
