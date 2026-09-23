import { CollectionForm as SharedCollectionForm } from '@/features/collections/components/collection-form'
import type { CollectionDef, Row } from '@/features/collections/types'
import { adminCollectionRoutes } from '../collections/routes'

export function CollectionForm({
  definition,
  record,
}: {
  definition: CollectionDef
  record?: Row
}) {
  return (
    <SharedCollectionForm
      definition={definition}
      record={record}
      routes={adminCollectionRoutes}
    />
  )
}
