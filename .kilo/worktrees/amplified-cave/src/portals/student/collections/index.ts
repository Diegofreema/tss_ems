import type { CollectionDef } from '@/features/collections/types'
import { assignments, results } from './assessment'
import { attendance } from './attendance'
import { invoices } from './finance'
import { courses, materials, timetable } from './learning'
import { library } from './library'

/** Every student list page, keyed by its route id. */
export const studentCollections = {
  courses,
  materials,
  library,
  timetable,
  assignments,
  results,
  attendance,
  invoices,
} satisfies Record<string, CollectionDef>
