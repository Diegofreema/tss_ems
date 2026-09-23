import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { adminPortal } from '@/portals/admin/config'
import { CollectionDetail } from '@/portals/admin/components/collection-detail'
import { loadCollection, loadRecord } from '@/portals/admin/collections/resolve'

export const Route = createFileRoute('/admin/$collection/$recordId/')({
  loader: async ({ params }) => {
    // A thin record lives in a modal over its register now; the page URL it
    // used to have carries the reader there instead of going dead.
    const found = loadCollection(params.collection)
    if (found?.definition.modal) {
      throw redirect({
        to: found.definition.path,
        search: { record: params.recordId },
      })
    }
    const loaded = await loadRecord(params.collection, params.recordId)
    if (!loaded) throw notFound()
    return loaded
  },
  notFoundComponent: portalNotFound(adminPortal),
  component: RecordDetail,
})

/*
 * `useLoaderData()` is briefly undefined when this route is already mounted and
 * the next navigation's loader throws `notFound()` — React renders the
 * component once more before the not-found boundary takes over. Bailing out of
 * that render keeps the 404 clean instead of crashing into the error boundary.
 */
function RecordDetail() {
  const loaded = Route.useLoaderData()
  if (!loaded) return null
  const { definition, record } = loaded
  return <CollectionDetail definition={definition} record={record} />
}
