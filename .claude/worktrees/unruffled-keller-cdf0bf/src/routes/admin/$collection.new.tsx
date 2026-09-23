import { createFileRoute, notFound } from '@tanstack/react-router'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { adminPortal } from '@/portals/admin/config'
import { primaryActionKind } from '@/features/collections/primary-action'
import { adminCollectionRoutes } from '@/portals/admin/collections/routes'
import { loadCollection } from '@/portals/admin/collections/resolve'
import { CollectionForm } from '@/portals/admin/components/collection-form'
import { adminFlows } from '@/portals/admin/features/actions/defs'

export const Route = createFileRoute('/admin/$collection/new')({
  loader: ({ params }) => {
    const loaded = loadCollection(params.collection)
    if (!loaded) throw notFound()
    // Only lists whose primary action creates a record have a create page.
    // Fee collection opens the payment flow, so this URL is not one of its own.
    const kind = primaryActionKind(
      loaded.definition,
      adminCollectionRoutes,
      adminFlows[params.collection],
    )
    if (kind !== 'create') throw notFound()
    return loaded
  },
  notFoundComponent: portalNotFound(adminPortal),
  component: NewRecord,
})

/*
 * `useLoaderData()` is briefly undefined when this route is already mounted and
 * the next navigation's loader throws `notFound()` — React renders the
 * component once more before the not-found boundary takes over. Bailing out of
 * that render keeps the 404 clean instead of crashing into the error boundary.
 */
function NewRecord() {
  const loaded = Route.useLoaderData()
  if (!loaded) return null
  return <CollectionForm definition={loaded.definition} />
}
