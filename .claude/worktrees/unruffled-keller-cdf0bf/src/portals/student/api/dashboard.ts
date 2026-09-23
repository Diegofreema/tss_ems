import type { StudentDashboard } from '@/api/my-schooling/types'
import type { Invoice } from '@/api/invoices/types'
import type { Bar } from '@/components/charts/bar-chart'
import type { ActivityEntry } from '@/components/common/activity-list'
import type { DashboardFigure } from '@/components/common/figure-tiles'
import {
  billEntries,
  feeBars,
  studentAction,
  type StudentAction,
  studentFigures,
  studentNote,
} from '../features/dashboard/dashboard'

export type StudentHome = {
  figures: DashboardFigure[]
  /** The line under the greeting, which says whether anything is waiting. */
  note: string
  /** Where the button beside the greeting points. */
  action: StudentAction
  /** The bills the school has raised, newest first. */
  bills: ActivityEntry[]
  fees: { bars: Bar[]; peak: number }
}

/**
 * The page is two endpoints, not one: the invoice list is the pupil's fee
 * ledger, and the counters are the only count of the results and materials
 * lists a pupil is given. The counters' own fee figures are not scoped to the
 * caller and are not read — see `feeCounts`.
 *
 * Shaped here rather than in the fetch so each cache entry holds what its
 * endpoint actually sent — the sidebar reads the same counters for its fee
 * tag, and a cache holding this page's tiles would have answered it with
 * figures where it expected the stats.
 */
export function studentHome(
  dashboard: StudentDashboard | undefined,
  invoices: Invoice[],
): StudentHome {
  const stats = dashboard?.stats ?? {
    invoices_total: invoices.length,
    invoices_unpaid: 0,
    results_available: 0,
    materials_available: 0,
    fees_settled_this_session: 0,
  }

  return {
    figures: studentFigures(stats, invoices),
    note: studentNote(stats, invoices),
    action: studentAction(invoices),
    bills: billEntries(invoices),
    fees: feeBars(invoices),
  }
}
