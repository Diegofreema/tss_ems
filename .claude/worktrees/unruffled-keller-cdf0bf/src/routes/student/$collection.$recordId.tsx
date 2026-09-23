import { createFileRoute, notFound } from '@tanstack/react-router'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { studentPortal } from '@/portals/student/config'
import { CollectionDetail } from '@/portals/student/components/collection-detail'
import { loadRecord } from '@/portals/student/collections/resolve'

export const Route = createFileRoute('/student/$collection/$recordId')({
  loader: async ({ params }) => {
    const loaded = await loadRecord(params.collection, params.recordId)
    if (!loaded) throw notFound()
    return loaded
  },
  notFoundComponent: portalNotFound(studentPortal),
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
