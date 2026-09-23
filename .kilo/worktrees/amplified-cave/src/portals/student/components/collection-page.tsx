import { CollectionPage as SharedCollectionPage } from '@/features/collections/components/collection-page'
import type { CollectionDef } from '@/features/collections/types'
import { studentCollectionRoutes } from '../collections/routes'

/** The shared list page in its read-only form: no edit, no delete, no create. */
export function CollectionPage({ definition }: { definition: CollectionDef }) {
  return (
    <SharedCollectionPage
      definition={definition}
      routes={studentCollectionRoutes}
    />
  )
}
