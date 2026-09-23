import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { adminPortal } from '@/portals/admin/config'
import { toast } from 'sonner'
import { DeniedState } from '@/components/feedback/denied-state'
import { adminCollections } from '@/portals/admin/collections'
import { adminFlows } from '@/portals/admin/features/actions/defs'
import { ActionPage } from '@/portals/admin/features/actions/action-page'

export const Route = createFileRoute('/admin/$collection/action')({
  // The record is optional: taking a payment starts without one, allocating a
  // fee starts from the fee. Keeping it in the URL makes the flow shareable.
  //
  // `flow` names which of the collection's flows was opened, for the registers
  // that have more than one. Left out, it is the first — which is what every
  // link written before there were two of anything still says.
  validateSearch: (search: Record<string, unknown>): { record?: string; flow?: string } => ({
    ...(typeof search.record === 'string' ? { record: search.record } : {}),
    ...(typeof search.flow === 'string' ? { flow: search.flow } : {}),
  }),
  loaderDeps: ({ search }) => ({ record: search.record, flow: search.flow }),
  loader: async ({ params, deps }) => {
    const definition = adminCollections[params.collection as keyof typeof adminCollections]
    const flows = definition ? adminFlows[params.collection] : undefined
    const flow = deps.flow
      ? flows?.find((one) => one.name === deps.flow)
      : flows?.[0]
    if (!definition || !flow) throw notFound()

    // A live collection is asked for the record; a fixture one holds its own.
    const row = !deps.record
      ? undefined
      : definition.record
        ? await definition.record(deps.record)
        : definition.rows?.find((one) => one.id === deps.record)
    if (deps.record && !row) throw notFound()

    // Typed out rather than reached from a button, by an account this flow is
    // closed to — or on a record it is closed on. The page exists and the
    // record is fine, so it says which of those it was instead of building a
    // form that must not be submitted. Asked after the record is in hand,
    // because half the reasons are about the record.
    if (flow.allowed && !flow.allowed(row)) {
      return {
        definition,
        denied: flow.label,
        deniedBody: flow.deniedBody?.(row),
        heading: { title: flow.label, crumb: definition.kicker },
      } as const
    }

    const action = await flow.build(row)
    return {
      definition,
      action,
      heading: { title: action.title, crumb: action.kicker },
    } as const
  },
  notFoundComponent: portalNotFound(adminPortal),
  component: FlowRoute,
})

/*
 * `useLoaderData()` is briefly undefined when this route is already mounted and
 * the next navigation's loader throws `notFound()` — React renders the
 * component once more before the not-found boundary takes over. Bailing out of
 * that render keeps the 404 clean instead of crashing into the error boundary.
 */
function FlowRoute() {
  const navigate = useNavigate()
  const loaded = Route.useLoaderData()
  if (!loaded) return null
  const { definition, denied, deniedBody, action } = loaded

  if (denied) {
    return (
      <DeniedState
        pageName={denied}
        body={deniedBody}
        dashboardPath="/admin"
        onRequestAccess={() => {
          toast('The school office has been asked')
          void navigate({ to: definition.path })
        }}
      />
    )
  }
  if (!action) return null
  return <ActionPage definition={definition} action={action} />
}
