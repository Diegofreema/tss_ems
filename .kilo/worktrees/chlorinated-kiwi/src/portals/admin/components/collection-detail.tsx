import { CollectionDetail as SharedCollectionDetail } from '@/features/collections/components/collection-detail'
import type { CollectionDef, Row } from '@/features/collections/types'
import { adminFlows } from '../features/actions/defs'
import { adminCollectionRoutes } from '../collections/routes'

export function CollectionDetail({
  definition,
  record,
}: {
  definition: CollectionDef
  /** Undefined where the record was asked for and did not come back. */
  record?: Row
}) {
  return (
    <SharedCollectionDetail
      definition={definition}
      record={record}
      routes={adminCollectionRoutes}
      flows={adminFlows[definition.id]}
    />
  )
}
