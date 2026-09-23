/**
 * The office's analytics: who is enrolled, what they scored, what was paid.
 *
 * Four reads and two writes, all under `/admins`. The reads answer for the
 * school as a whole rather than for one record, so none of them paginates and
 * none takes a search.
 */

/** One bucket of a breakdown: how many admitted pupils fall in it. */
export type Bucket<TKey extends string, TValue> = { count: number } & Record<
  TKey,
  TValue
>

/**
 * Admitted-student counts, one array per dimension.
 *
 * Three of the four dimensions are keyed by id rather than by name — the
 * endpoint counts and does not join. `department_id` is resolved from the
 * class feed and `state_id` from the school's own state numbering; there is
 * no catalogue for `lga_id` on this API at all, so local governments are
 * counted rather than named. See `country-ids.ts`.
 */
export type BusinessIntelligence = {
  by_class: Bucket<'department_id', number | null>[]
  by_gender: Bucket<'gender', string | null>[]
  by_state: Bucket<'state_id', number | null>[]
  by_lga: Bucket<'lga_id', number | null>[]
}

/**
 * One point of a two-session comparison.
 *
 * **The keys are unverified.** Both `result-analytics` and
 * `financial-analytics` answer with `current` and `previous`, and on the only
 * live reading of each all four arrays came back empty — the school has no
 * results filed and no payments taken against the session that was asked for.
 * So a point is read for its label and its figure rather than for named
 * fields; `seriesPoint` in the analytics feature is the single place that
 * does it, and the single place to correct once a populated one is seen.
 */
export type SeriesPoint = Record<string, unknown>

/** Both parameters are required — the endpoint compares one subject's grades. */
export type ResultAnalyticsParams = {
  subject_id: number
  session_id: number
}

/** Grade distribution for one subject, this session against the last. */
export type ResultAnalytics = {
  subject: { id: number; name: string } | null
  session_id: number
  current: SeriesPoint[]
  previous: SeriesPoint[]
}

/** Monthly payment totals for one session and the one before it. */
export type FinancialAnalytics = {
  session_id: number
  current: SeriesPoint[]
  previous: SeriesPoint[]
}

export type PaymentListParams = {
  session_id?: number
  limit?: number
}

/**
 * One settled transaction. **Unverified, like the series above** — the list
 * has never been read with anything on it. `paymentRow` reads it for the four
 * things a reconciliation needs and names no field it has not been told about.
 */
export type Payment = Record<string, unknown>

/**
 * The envelope the list arrives in. Which key holds the rows is unverified
 * too, so the whole answer is handed on and `paymentRows` finds them.
 */
export type PaymentList = Record<string, unknown>

/** Asks Interswitch about a reference and settles it locally if confirmed. */
export type RetryPaymentBody = {
  payref: string
  /** The API takes the expected amount as a string, not a number. */
  amount: string
}

/** Asks Remita about an RRR and settles both transaction and invoice. */
export type CheckRrrBody = {
  /** Twelve digits, as Remita issues them. */
  rrr: string
}
