import type { CollectionRoutes } from '@/features/collections/types'

/** Parents read their children's records; the school edits them. */
export const parentCollectionRoutes: CollectionRoutes = {
  record: '/parent/$collection/$recordId',
}
