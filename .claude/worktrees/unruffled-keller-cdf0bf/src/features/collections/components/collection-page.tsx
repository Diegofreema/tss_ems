import type { CollectionDef, CollectionRoutes, FlowSpec } from '../types'
import { CollectionList } from './collection-list'

/**
 * Renders any collection as the design's list page.
 *
 * No Suspense boundary: the list does not suspend. It keeps the rows it has
 * while the next set is fetched and draws its own skeleton for the first load,
 * which is the only time there is nothing to keep.
 */
export function CollectionPage({
  definition,
  routes,
  flows,
}: {
  definition: CollectionDef
  routes: CollectionRoutes
  flows?: readonly FlowSpec[]
}) {
  return <CollectionList definition={definition} routes={routes} flows={flows} />
}
