import type { CollectionRoutes } from '@/features/collections/types'

/** Students only read their records, so no edit or create route is published. */
export const studentCollectionRoutes: CollectionRoutes = {
  record: '/student/$collection/$recordId',
}
