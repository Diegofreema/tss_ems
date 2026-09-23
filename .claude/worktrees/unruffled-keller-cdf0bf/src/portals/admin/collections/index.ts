import { collect, fees, invoices, spendings } from './finance'
import { arms, classes, subjects } from './academics'
import { sessions, terms } from './calendar'
import { timetable } from './timetable'
import { parents, parentsDeactivated } from './parents'
import { library } from './library'
import { notices } from './notices'
import { results, resultQueue } from './results'
import { logs } from './school'
import { staff, staffAdmin, staffOther, staffTeachers } from './staff'
import { applicants, students } from './students'
import type { CollectionDef } from '@/features/collections/types'

/** Every admin list page, keyed by its route id. */
export const adminCollections = {
  fees,
  collect,
  invoices,
  spendings,
  students,
  applicants,
  staff,
  'staff-admin': staffAdmin,
  'staff-teachers': staffTeachers,
  'staff-other': staffOther,
  parents,
  'parents-invited': parentsDeactivated,
  classes,
  arms,
  subjects,
  calendar: sessions,
  terms,
  timetable,
  library,
  notices,
  results,
  'result-queue': resultQueue,
  logs,
} satisfies Record<string, CollectionDef>

export type AdminCollectionId = keyof typeof adminCollections
