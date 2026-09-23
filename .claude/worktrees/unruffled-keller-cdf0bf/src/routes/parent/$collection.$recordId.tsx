import { createFileRoute, notFound } from '@tanstack/react-router'
import { useSessionStore } from '@/stores/session.store'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { parentPortal } from '@/portals/parent/config'
import { loadRecord } from '@/features/collections/resolve'
import { familyQuery, parentIdOf } from '@/portals/parent/api/family'
import { parentCollections } from '@/portals/parent/collections'
import { CollectionDetail } from '@/portals/parent/components/collection-detail'

export const Route = createFileRoute('/parent/$collection/$recordId')({
  /**
   * A record is looked up across every child, not just the selected one, so a
   * shared link opens even when the switcher is on the other child. The
   * definition returned is the one the record actually belongs to.
   */
  loader: async ({ context, params }) => {
    const family = await context.queryClient.ensureQueryData(
      familyQuery(parentIdOf(useSessionStore.getState().account)),
    )

    // A collection that resolves without a record has looked and not found it;
    // the next child may still hold it, so only a hit ends the search.
    let looked
    for (const child of family) {
      const loaded = await loadRecord(
        parentCollections(child, family),
        params.collection,
        params.recordId,
      )
      if (loaded?.record) return loaded
      looked ??= loaded
    }
    if (looked) return looked
    throw notFound()
  },
  notFoundComponent: portalNotFound(parentPortal),
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
