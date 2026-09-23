import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { portalNotFound } from '@/components/feedback/portal-not-found'
import { parentPortal } from '@/portals/parent/config'
import { loadRecord } from '@/features/collections/resolve'
import {
  parentAttendance,
  parentChildren,
  parentInvoices,
} from '@/db/collections/parent'
import { composeFamily, type OwnedMark } from '@/portals/parent/family'
import { parentCollections } from '@/portals/parent/collections'
import { CollectionDetail } from '@/portals/parent/components/collection-detail'

export const Route = createFileRoute('/parent/$collection/$recordId')({
  /**
   * A record is looked up across every child, not just the selected one, so a
   * shared link opens even when the switcher is on the other child. The
   * definition returned is the one the record actually belongs to.
   */
  loader: async ({ params }) => {
    /*
     * `preload` is the documented way to make a collection ready from a route
     * loader, and the only correct place to call it — never from a mutation
     * handler or the outbox drain, where it deadlocks.
     *
     * A refusal is swallowed rather than thrown. A device that already holds
     * the household must still open the record on it: the sync failing is not
     * the same as the record being missing, and the search below decides that
     * for itself. A device holding nothing falls through to `notFound`, which
     * is the honest answer.
     */
    await Promise.all(
      [parentChildren, parentInvoices, parentAttendance].map((collection) =>
        collection.preload().catch(() => undefined),
      ),
    )

    const family = composeFamily(
      parentChildren.toArray,
      parentInvoices.toArray,
      parentAttendance.toArray as OwnedMark[],
      new Date(),
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
      // A thin record lives in a modal over its register now; the page URL it
      // used to have carries the reader there instead of going dead.
      if (loaded?.definition.modal) {
        throw redirect({
          to: loaded.definition.path,
          search: { record: params.recordId },
        })
      }
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
