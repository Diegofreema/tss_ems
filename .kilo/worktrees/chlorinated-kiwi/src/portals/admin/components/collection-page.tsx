import { CollectionPage as SharedCollectionPage } from '@/features/collections/components/collection-page'
import type { CollectionDef } from '@/features/collections/types'
import { adminFlows } from '../features/actions/defs'
import { adminCollectionRoutes } from '../collections/routes'

/** The shared list page, pointed at the admin portal's record routes. */
export function CollectionPage({ definition }: { definition: CollectionDef }) {
  return (
    <SharedCollectionPage
      definition={definition}
      routes={adminCollectionRoutes}
      flows={adminFlows[definition.id]}
    />
  )
}
