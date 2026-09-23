import { CollectionForm as SharedCollectionForm } from '@/features/collections/components/collection-form'
import type { CollectionDef, Row } from '@/features/collections/types'
import { adminCollectionRoutes } from '../collections/routes'

export function CollectionForm({
  definition,
  record,
  preset,
}: {
  definition: CollectionDef
  record?: Row
  /** Fields decided by the page that opened the form. See the shared one. */
  preset?: Record<string, string>
}) {
  return (
    <SharedCollectionForm
      definition={definition}
      record={record}
      routes={adminCollectionRoutes}
      preset={preset}
    />
  )
}
