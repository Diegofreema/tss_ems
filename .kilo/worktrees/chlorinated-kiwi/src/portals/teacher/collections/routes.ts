import type { CollectionRoutes } from '@/features/collections/types'

/** Where the teacher portal mounts its generic record routes. */
export const teacherCollectionRoutes: CollectionRoutes = {
  record: '/teacher/$collection/$recordId',
  edit: '/teacher/$collection/$recordId/edit',
  create: '/teacher/$collection/new',
}
