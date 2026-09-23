import type { CollectionDef } from '@/features/collections/types'
import { assignments } from './assignments'
import { results, uploads } from './assessment'
import { eclasses, students, subjects, topics } from './teaching'

/** Every teacher list page, keyed by its route id. */
export const teacherCollections = {
  subjects,
  students,
  topics,
  eclasses,
  uploads,
  results,
  assignments,
} satisfies Record<string, CollectionDef>
