import { paginated, request } from '../client'
import type { Id } from '../types'
import type { Spending, SpendingBody, SpendingListParams, SpendingMonth } from './types'

export const spendingsService = {
  /**
   * Newest first. `total_amount` covers everything the filter matches, not
   * just the page, so it is carried alongside the page of rows.
   */
  list: (params: SpendingListParams = {}) =>
    request<Record<string, unknown>>('spendings', { query: { ...params } }).then((data) => ({
      ...paginated<Spending>(data, 'spendings'),
      totalAmount: (data.total_amount as number | undefined) ?? 0,
    })),

  /** Totals and entry counts per month. */
  summary: () =>
    request<{ months: SpendingMonth[] }>('spendings/summary').then((data) => data.months),

  get: (id: Id) =>
    request<{ spending: Spending }>(`spendings/${id}`).then((data) => data.spending),

  create: (body: SpendingBody) =>
    request<{ spending: Spending }>('spendings', { method: 'POST', body }),

  /** The before/after amount is written to the activity log. */
  update: (id: Id, body: SpendingBody) =>
    request<{ spending: Spending }>(`spendings/${id}`, { method: 'POST', body }),

  remove: (id: Id) => request<unknown>(`spendings/${id}`, { method: 'DELETE' }),
}
