import { CollectionPage as SharedCollectionPage } from '@/features/collections/components/collection-page'
import type { CollectionDef } from '@/features/collections/types'
import { teacherCollectionRoutes } from '../collections/routes'

/** The shared list page, pointed at the teacher portal's record routes. */
export function CollectionPage({ definition }: { definition: CollectionDef }) {
  return (
    <SharedCollectionPage
      definition={definition}
      routes={teacherCollectionRoutes}
    />
  )
}
