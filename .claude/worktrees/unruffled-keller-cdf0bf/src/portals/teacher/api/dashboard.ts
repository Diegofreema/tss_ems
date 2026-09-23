import { queryOptions } from '@tanstack/react-query'
import { teachingService } from '@/api/teaching/service'
import { teachingKeys } from '@/api/teaching/keys'
import type { TeacherDashboard } from '@/api/teaching/types'
import type { ActivityEntry } from '@/components/common/activity-list'
import type { DashboardFigure } from '@/components/common/figure-tiles'
import {
  armRows,
  assignmentEntries,
  teacherFigures,
  teacherNote,
} from '../features/dashboard/dashboard'

export type TeacherHome = {
  figures: DashboardFigure[]
  /** The line under the greeting, which says whether anything is waiting. */
  note: string
  /** The assignments this teacher has set, newest first. */
  assignments: ActivityEntry[]
  /** The arms taken, each against its class. */
  arms: { label: string; value: string }[]
}

/**
 * The dashboard's own view of `GET /teachers/me/dashboard`.
 *
 * Shaped in a `select` rather than in the fetch so the cache holds what the
 * endpoint actually sent: the notification feed reads the same key, and a
 * cache entry holding this page's tiles would have answered it with figures
 * where it expected a payload.
 */
function toTeacherHome(dashboard: TeacherDashboard): TeacherHome {
  const now = new Date()

  return {
    figures: teacherFigures(dashboard),
    note: teacherNote(dashboard.stats),
    assignments: assignmentEntries(dashboard.recent_assignments, now),
    arms: armRows(dashboard.class_arms),
  }
}

/** `GET /teachers/me/dashboard` — the counters, the assignments and the arms. */
export const teacherDashboardQuery = queryOptions({
  queryKey: teachingKeys.dashboard(),
  queryFn: () => teachingService.dashboard(),
  select: toTeacherHome,
})
