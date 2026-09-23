import { CollectionPage as SharedCollectionPage } from '@/features/collections/components/collection-page'
import type { CollectionDef } from '@/features/collections/types'
import { parentCollectionRoutes } from '../collections/routes'

/** The shared list page in its read-only form, for the parent portal. */
export function CollectionPage({ definition }: { definition: CollectionDef }) {
  return (
    <SharedCollectionPage
      definition={definition}
      routes={parentCollectionRoutes}
    />
  )
}
