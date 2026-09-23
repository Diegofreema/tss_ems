import type {
  BusinessIntelligence,
  Payment,
  PaymentList,
  SeriesPoint,
} from '../../../../api/analytics/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import type { Option } from '../../../../features/collections/options.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { schoolTime, when } from '../../../../features/collections/when.ts'
import { formatCount, formatNaira } from '../../../../lib/format.ts'

/*
 * The bars, the rates and the tiles are typed by the components that draw
 * them, and those are `.tsx` — which this module cannot import, because the
 * test runner type-strips `.ts` alone. The shapes are inferred here and
 * assigned into the components' own types on the page, so a change to either
 * side fails the build there. Same arrangement as the dashboard's.
 */

/* ------------------------------------------------------------------ *
 * Enrolment — `admins/business-intelligence`
 * ------------------------------------------------------------------ */

/** Everyone the breakdown counted. Each dimension totals the same school. */
export function admitted(buckets: { count: number }[]): number {
  return buckets.reduce((total, bucket) => total + (Number(bucket.count) || 0), 0)
}

/**
 * The four figures over the breakdown.
 *
 * Gender is counted rather than listed here because a school with three
 * genders on file would push the tile strip onto a second row; the split
 * itself is drawn below, where it has room.
 */
export function enrolmentTiles(intelligence: BusinessIntelligence | undefined) {
  const classes = intelligence?.by_class ?? []
  const states = intelligence?.by_state ?? []
  const lgas = intelligence?.by_lga ?? []

  return [
    {
      label: 'Admitted students',
      value: formatCount(admitted(classes)),
      delta: 'Counted by the API, not by this page',
    },
    {
      label: 'Classes',
      value: formatCount(classes.length),
      delta: 'With at least one student admitted',
    },
    {
      label: 'States of origin',
      value: formatCount(states.length),
      delta: `${formatCount(admitted(states))} students have one on file`,
    },
    {
      label: 'Local governments',
      // Named nowhere on this API — see the note on `BusinessIntelligence`.
      value: formatCount(lgas.length),
      delta: 'The school holds no list of names for these',
    },
  ]
}

/** Students per class, tallest first, so the largest arm reads at a glance. */
export function classBars(
  intelligence: BusinessIntelligence | undefined,
  names: ReadonlyMap<string, string>,
) {
  return [...(intelligence?.by_class ?? [])]
    .sort((one, two) => two.count - one.count)
    .map((bucket) => ({
      label:
        names.get(String(bucket.department_id)) ??
        (bucket.department_id === null ? 'No class' : `Class ${bucket.department_id}`),
      value: bucket.count,
      display: formatCount(bucket.count),
    }))
}

/** The gender split as shares of everyone counted. */
export function genderRates(intelligence: BusinessIntelligence | undefined) {
  const buckets = intelligence?.by_gender ?? []
  const total = admitted(buckets)

  return buckets.map((bucket) => ({
    label: bucket.gender?.trim() || 'Not recorded',
    percent: total ? Math.round((bucket.count / total) * 100) : 0,
    amount: `${formatCount(bucket.count)} ${bucket.count === 1 ? 'student' : 'students'}`,
  }))
}

/**
 * Students by state of origin, most first.
 *
 * `state_id` is the school's own numbering, which `optionLabels('states')`
 * can resolve for Nigeria and nowhere else; a state it cannot name is shown
 * by its id rather than dropped, because the count is real either way.
 */
export function stateRows(
  intelligence: BusinessIntelligence | undefined,
  names: ReadonlyMap<string, string>,
): Row[] {
  return [...(intelligence?.by_state ?? [])]
    .sort((one, two) => two.count - one.count)
    .map((bucket) => ({
      id: String(bucket.state_id ?? 'none'),
      state:
        names.get(String(bucket.state_id)) ??
        (bucket.state_id === null ? 'Not recorded' : `State ${bucket.state_id}`),
      students: formatCount(bucket.count),
    }))
}

/* ------------------------------------------------------------------ *
 * The two comparisons — `result-analytics` and `financial-analytics`
 * ------------------------------------------------------------------ */

/*
 * Both endpoints answer with `current` and `previous`, and on the only live
 * reading of each all four arrays were empty: this school has no results
 * filed and no payments taken against the session that was asked for. So the
 * *names* of a point's fields have never been seen.
 *
 * Rather than pin a key that may not exist — and draw an empty chart for ever
 * if it does not — a point is read for the one field that reads as its label
 * and the one that reads as its figure. A month with a total and a grade with
 * a count are both exactly that. The lists below are tried in order first, so
 * a point carrying several fields is read for the right ones; anything else
 * falls back to the first text field and the first number.
 *
 * ponytail: this is the whole guess, in one place, under test. Replace both
 * lists with the real key the moment a populated series is read.
 */

const LABEL_KEYS = [
  'month',
  'month_name',
  'period',
  'grade',
  'grade_name',
  'band',
  'label',
  'name',
]

const VALUE_KEYS = ['total', 'total_amount', 'amount', 'sum', 'count', 'value']

/** An id is a key, never a figure — it would plot as a wild outlier. */
function isId(key: string): boolean {
  return key === 'id' || key.endsWith('_id')
}

function readable(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number'
}

export function pointLabel(point: SeriesPoint): string {
  for (const key of LABEL_KEYS) {
    if (readable(point[key])) return String(point[key]).trim()
  }
  for (const [key, value] of Object.entries(point)) {
    if (!isId(key) && typeof value === 'string' && value.trim()) return value.trim()
  }
  return BLANK
}

export function pointValue(point: SeriesPoint): number {
  for (const key of VALUE_KEYS) {
    const figure = Number(point[key])
    if (point[key] !== null && point[key] !== undefined && Number.isFinite(figure)) {
      return figure
    }
  }
  for (const [key, value] of Object.entries(point)) {
    if (isId(key) || typeof value === 'boolean') continue
    const figure = Number(value)
    if (value !== null && value !== '' && Number.isFinite(figure)) return figure
  }
  return 0
}

/** One series as bars, written as money or as a plain tally. */
export function seriesBars(points: SeriesPoint[] | undefined, money: boolean) {
  return (points ?? []).map((point) => {
    const value = pointValue(point)
    return {
      label: pointLabel(point),
      value,
      display: money ? formatNaira(value) : formatCount(value),
    }
  })
}

/**
 * The height both halves of a comparison are drawn against.
 *
 * One peak, not two: a session that took twice as much as the last has to
 * look like it, and two charts each scaled to their own tallest bar would
 * draw the two as identical. Never zero — a chart divides by this.
 */
export function sharedPeak(...series: { value: number }[][]): number {
  const tallest = Math.max(0, ...series.flat().map((bar) => bar.value))
  return tallest || 1
}

/** What a comparison came to over the whole session, for the caption. */
export function seriesTotal(points: SeriesPoint[] | undefined): number {
  return (points ?? []).reduce((total, point) => total + pointValue(point), 0)
}

/* ------------------------------------------------------------------ *
 * Settled transactions — `admins/payments`
 * ------------------------------------------------------------------ */

/**
 * How many settled transactions to ask `payments` for — the endpoint's own
 * `limit`, offered as a choice rather than fixed, because reconciling a busy
 * term needs more rows than glancing at a quiet one.
 */
export const LIMITS: Option[] = [
  { value: '25', label: '25 newest' },
  { value: '50', label: '50 newest' },
  { value: '100', label: '100 newest' },
  { value: '250', label: '250 newest' },
]

/** What `payments` is asked for until somebody chooses otherwise. */
export const DEFAULT_LIMIT = '100'

/** The keys a transaction might carry each of its four readable parts under. */
const WHEN_KEYS = ['payment_date', 'paydate', 'payday', 'datecreated', 'createdate', 'created_at']
const WHO_KEYS = ['student', 'student_name', 'fullname', 'name', 'payer', 'email']
const FEE_KEYS = ['fee', 'fee_name', 'description', 'purpose', 'narration']
const AMOUNT_KEYS = ['amount', 'total', 'amount_paid', 'paid_amount']
const REFERENCE_KEYS = ['payref', 'reference', 'rrr', 'transaction_ref', 'trans_ref', 'txn_ref']

/**
 * The rows out of the list envelope.
 *
 * Which key holds them has never been seen either, so the named ones are
 * tried and then any array on the answer is taken — there is only ever one.
 */
export function paymentRows(answer: PaymentList | undefined): Payment[] {
  if (!answer) return []
  for (const key of ['payments', 'transactions', 'items', 'data']) {
    if (Array.isArray(answer[key])) return answer[key] as Payment[]
  }
  const found = Object.values(answer).find(Array.isArray)
  return (found as Payment[] | undefined) ?? []
}

function first(payment: Payment, keys: string[]): string {
  for (const key of keys) {
    const value = payment[key]
    if (readable(value) && String(value).trim()) return String(value).trim()
  }
  return ''
}

/**
 * One settled transaction as a reconciliation reads it: when it landed, who
 * paid, what for, how much and against which reference. The reference is what
 * a bursar re-checks with when a payment is disputed, so it is never dropped.
 */
export function paymentRow(payment: Payment, index: number): Row {
  const billed = first(payment, AMOUNT_KEYS)
  const amount = Number(billed)
  const reference = first(payment, REFERENCE_KEYS)
  const paid = first(payment, WHEN_KEYS)

  return {
    // The list carries no id this page can rely on, and two payments of the
    // same amount on the same day are not the same payment.
    // `||` and not `??`: an absent reference reads as an empty string, which
    // is nullish to nobody and would key every unreferenced row the same.
    id: String(payment.id ?? '') || reference || String(index),
    paid: paid ? when(schoolTime(paid), true) : BLANK,
    payer: first(payment, WHO_KEYS) || BLANK,
    fee: first(payment, FEE_KEYS) || BLANK,
    // A transaction with no amount on it reads blank, not free.
    amount: billed && Number.isFinite(amount) ? formatNaira(amount) : BLANK,
    reference: reference || BLANK,
  }
}

/** What the settled list comes to, for the figure above it. */
export function paymentsTotal(payments: Payment[]): number {
  return payments.reduce((total, payment) => {
    const amount = Number(first(payment, AMOUNT_KEYS))
    return total + (Number.isFinite(amount) ? amount : 0)
  }, 0)
}
