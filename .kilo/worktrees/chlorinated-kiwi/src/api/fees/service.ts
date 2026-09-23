import { paginated, request } from '../client'
import type { Id } from '../types'
import type { AllocateFeeBody, Fee, FeeBody, FeeListParams, FeeOptions } from './types'

export const feesService = {
  list: (params: FeeListParams = {}) =>
    request<Record<string, unknown>>('fees', { query: { ...params } }).then((data) =>
      paginated<Fee>(data, 'fees'),
    ),

  options: () => request<FeeOptions>('fees/options'),

  /** Includes what it applies to and the count of rows depending on it. */
  get: (id: Id) => request<{ fee: Fee }>(`fees/${id}`).then((data) => data.fee),

  create: (body: FeeBody) => request<{ fee: Fee }>('fees', { method: 'POST', body }),

  update: (id: Id, body: FeeBody) =>
    request<{ fee: Fee }>(`fees/${id}`, { method: 'POST', body }),

  /**
   * The safe way to retire a fee: it stops being charged while invoices
   * already raised against it stay intact and payable.
   */
  deactivate: (id: Id) => request<unknown>(`fees/${id}/deactivate`, { method: 'POST' }),

  activate: (id: Id) => request<unknown>(`fees/${id}/activate`, { method: 'POST' }),

  /** Raises the fee against every student in the classes given. */
  allocate: (id: Id, body: AllocateFeeBody) =>
    request<unknown>(`fees/${id}/allocate`, { method: 'POST', body }),

  /**
   * Refused with 409 while anything references the fee, with the counts in
   * `errors.dependencies`. `force` deletes anyway and leaves those rows
   * pointing at nothing — deactivating is almost always what you want.
   */
  remove: (id: Id, force = false) =>
    request<unknown>(`fees/${id}`, { method: 'DELETE', query: { force: force ? 1 : undefined } }),
}
