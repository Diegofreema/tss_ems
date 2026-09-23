import type { CollectionRoutes } from '@/features/collections/types'

/** Where the admin portal mounts its generic record routes. */
export const adminCollectionRoutes: CollectionRoutes = {
  record: '/admin/$collection/$recordId',
  edit: '/admin/$collection/$recordId/edit',
  create: '/admin/$collection/new',
  flow: '/admin/$collection/action',
}
