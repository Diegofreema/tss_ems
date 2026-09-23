import type { CollectionDef } from '@/features/collections/types'
import { assignments, results } from './assessment'
import { attendance } from './attendance'
import { invoices } from './finance'
import { courses, materials, timetable } from './learning'

/** Every student list page, keyed by its route id. */
export const studentCollections = {
  courses,
  materials,
  timetable,
  assignments,
  results,
  attendance,
  invoices,
} satisfies Record<string, CollectionDef>
