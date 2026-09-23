import { createFileRoute, notFound } from '@tanstack/react-router'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { teacherPortal } from '@/portals/teacher/config'
import { CollectionForm } from '@/portals/teacher/components/collection-form'
import { loadCollection } from '@/portals/teacher/collections/resolve'

export const Route = createFileRoute('/teacher/$collection/new')({
  loader: ({ params }) => {
    const loaded = loadCollection(params.collection)
    if (!loaded) throw notFound()
    return loaded
  },
  notFoundComponent: portalNotFound(teacherPortal),
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
