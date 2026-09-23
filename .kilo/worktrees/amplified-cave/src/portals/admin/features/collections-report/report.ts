import type {
  CollectionsReport,
  CollectionsReportParams,
  MethodTotals,
} from '../../../../api/collect-fees/types.ts'
import { rangeLabel as rangeText } from '../../../../features/collections/date-range.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { formatCount, formatNaira } from '../../../../lib/format.ts'
import { methodTotalsRow } from '../../collections/collect-row.ts'

/** The sentinel a select uses for "no filter" — Radix has no empty option. */
export const ANY_METHOD = 'all'

/**
 * What the report is asked for. A blank range is left off entirely rather than
 * sent empty — the endpoint defaults to the current month, and that default is
 * better than anything this page could invent.
 */
export function reportParams(input: {
  start?: string | null
  end?: string | null
  method?: string | null
}): CollectionsReportParams {
  return {
    ...(input.start ? { start_date: input.start } : {}),
    ...(input.end ? { end_date: input.end } : {}),
    ...(input.method && input.method !== ANY_METHOD
      ? { payment_method: input.method }
      : {}),
  }
}

/**
 * The three figures over the report. Collected is money in; discount is money
 * deliberately given up, which a bursar is answerable for separately.
 */
export function reportTiles(totals: MethodTotals | undefined) {
  return [
    { label: 'Collected', value: formatNaira(totals?.amount ?? 0) },
    { label: 'Discounted', value: formatNaira(totals?.discount ?? 0) },
    { label: 'Payments', value: formatCount(totals?.entries ?? 0) },
  ]
}

/**
 * The per-method breakdown. Methods with nothing against them are dropped: the
 * API returns all four every time, and three empty rows under one real one
 * read as a fault rather than as a quiet week.
 */
export function methodRows(
  report: CollectionsReport | undefined,
  methods?: Record<string, string>,
): Row[] {
  return Object.entries(report?.by_method ?? {})
    .filter(([, totals]) => (totals?.entries ?? 0) > 0)
    .map(([method, totals]) => methodTotalsRow(method, totals, methods))
}

/**
 * The range the API actually used, which is not always the one that was asked
 * for — it defaults an empty range to this month and swaps one given
 * backwards, and the page has to say which dates the figures are for.
 */
export function rangeLabel(report: CollectionsReport | undefined): string {
  return rangeText(report?.range?.from ?? '', report?.range?.to ?? '') || 'this month'
}
