import { queryOptions } from '@tanstack/react-query'
import { invoicesService } from '@/api/invoices/service'
import { scanPages } from '@/api/url'
import { logsService } from '@/api/logs/service'
import { spendingsService } from '@/api/spendings/service'
import { usersService } from '@/api/users/service'
import type { Bar } from '@/components/charts/bar-chart'
import type { ActivityEntry } from '@/components/common/activity-list'
import type { DashboardFigure } from '@/components/common/figure-tiles'
import type { Tile } from '@/components/page/tile-strip'
import {
  activityEntries,
  collectionBars,
  financeFigures,
  ledgerTotals,
  peopleFigures,
  readStats,
  schoolTiles,
} from '../features/dashboard/dashboard'

/**
 * Which halves of the home page this account is shown, and so which of the
 * scans are worth making: the invoice register and the spending summary are
 * the Fees and Payments section's, the audit log the Admin section's. A scan made for a
 * panel that will not be drawn is up to six requests the school refuses.
 */
export type DashboardScope = { money: boolean; activity: boolean }

export type AdminDashboard = {
  money: DashboardFigure[]
  people: DashboardFigure[]
  school: Tile[]
  collections: { bars: Bar[]; peak: number }
  activity: ActivityEntry[]
}

/**
 * Invoices asked for per request while the register is totalled.
 *
 * There is no endpoint that adds the ledger up server-side: `/collect-fees`
 * counts one session and only the part still owing, and the dashboard
 * endpoint's own money figures do not reconcile with the invoices they claim
 * to total. So the register is pulled and added up here.
 *
 * Asked for, not assumed. The server may answer with a smaller page than this,
 * and the scan follows the `pagination` it sends back rather than the limit it
 * was given.
 */
const LEDGER_PAGE = 1000

/**
 * The most requests the home page will spend on the register before it stops
 * asking and says what it covered.
 *
 * ponytail: a whole-ledger scan. This bound is what keeps a school with years
 * of billing behind it from opening its dashboard on a dozen round trips —
 * past it the money tiles read as a window on the newest invoices rather than
 * as a total, which `financeFigures` writes into the tiles themselves. Drop
 * the scan entirely the moment the API grows a server-side sum.
 */
const LEDGER_REQUESTS = 6

/** How many audit entries the feed beside the chart has room for. */
const FEED_SIZE = 6

/**
 * The invoice register, and how many invoices it actually holds.
 *
 * The count is the register's own, off the pagination — the same figure the
 * invoices page puts under "Invoices raised". Reading it back is what lets the
 * tiles tell a complete total from a partial one; totalling whatever arrived
 * and calling it the ledger is how two screens of one app come to disagree.
 */
const scanLedger = () =>
  scanPages(
    (page) => invoicesService.list({ page, limit: LEDGER_PAGE }),
    LEDGER_REQUESTS,
  )

/**
 * Everything the admin home page shows, from the four endpoints that between
 * them hold it: the counters, the invoice register, the spending summary and
 * the audit log.
 *
 * The counters answer for people and the register for money, deliberately.
 * `/users/dashboard` also sends `total_revenue`, `fees_collected` and a
 * revenue series, and those three disagree with one another and with the
 * invoices on file — a school with settled invoices reads `total_revenue: 0` —
 * so nothing here reads them.
 */
async function fetchDashboard(scope: DashboardScope): Promise<AdminDashboard> {
  const [counters, ledger, spending, logs] = await Promise.all([
    usersService.dashboard(),
    scope.money ? scanLedger() : { items: [], total: 0 },
    scope.money ? spendingsService.summary() : [],
    scope.activity ? logsService.list({ limit: FEED_SIZE }) : { items: [] },
  ])

  const today = new Date()
  const collections = collectionBars(ledger.items, today)
  const money: DashboardFigure[] = scope.money
    ? financeFigures(ledgerTotals(ledger.items, ledger.total), spending, today)
    : []
  // The Collected card pulses with the same six months the chart below draws —
  // the one series this dashboard genuinely has, so the one sparkline it gets.
  const collected = money.find((figure) => figure.label === 'Collected')
  if (collected) collected.spark = collections.bars.map((bar) => bar.value)

  const stats = readStats(counters?.stats)
  return {
    money,
    people: peopleFigures(stats),
    school: schoolTiles(stats),
    collections,
    activity: activityEntries(logs.items, today),
  }
}

export const adminDashboardQuery = (scope: DashboardScope) =>
  queryOptions({
  // The scope is in the key, so an account granted Report this morning is not
  // drawn the money-less page cached before it was.
  queryKey: ['admin', 'dashboard', scope.money, scope.activity],
  queryFn: () => fetchDashboard(scope),
  // `always`, so an offline device fails fast into the route's error boundary
  // instead of pausing the loader on a promise that never settles.
  networkMode: 'always',
  })
