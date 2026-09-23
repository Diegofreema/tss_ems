import { createFileRoute, notFound } from '@tanstack/react-router'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { adminPortal } from '@/portals/admin/config'
import { CollectionForm } from '@/portals/admin/components/collection-form'
import { loadRecordForEdit } from '@/portals/admin/collections/resolve'

export const Route = createFileRoute('/admin/$collection/$recordId/edit')({
  loader: async ({ params }) => {
    const loaded = await loadRecordForEdit(params.collection, params.recordId)
    if (!loaded) throw notFound()
    return loaded
  },
  notFoundComponent: portalNotFound(adminPortal),
  component: RecordEdit,
})

/*
 * `useLoaderData()` is briefly undefined when this route is already mounted and
 * the next navigation's loader throws `notFound()` — React renders the
 * component once more before the not-found boundary takes over. Bailing out of
 * that render keeps the 404 clean instead of crashing into the error boundary.
 */
function RecordEdit() {
  const loaded = Route.useLoaderData()
  if (!loaded) return null
  const { definition, record } = loaded
  return <CollectionForm definition={definition} record={record} />
}
