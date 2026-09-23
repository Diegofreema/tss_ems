import type { PageParams } from '../types.ts'
import type { User } from '../users/types.ts'

/**
 * One line of the expenditure ledger. `amount` is a decimal string —
 * `"20500.00"` — and `user` is the account that recorded it, expanded by both
 * the list and the detail endpoint.
 */
export type Spending = {
  id: number
  amount: number | string
  description: string
  datecreated: string
  user_id: number
  user?: User
}

export type SpendingListParams = PageParams & {
  /** YYYY-MM-DD bounds. */
  from?: string
  to?: string
  q?: string
}

/**
 * `datecreated` and `user_id` are set server-side, so an entry cannot be
 * backdated or attributed to someone else.
 */
export type SpendingBody = {
  amount: number
  description: string
}

/** One month of `GET /spendings/summary`, keyed `YYYY-MM`. */
export type SpendingMonth = {
  month: string
  total: number
  entries: number
}
