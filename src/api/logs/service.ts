import { paginated, request } from '../client'
import type { Id } from '../types'
import type { ActivityLog, LogListParams, LogTypeCounts } from './types'

export const logsService = {
  /** Newest first. `limit` defaults to 50 and is capped at 500. */
  list: (params: LogListParams = {}) =>
    request<Record<string, unknown>>('logs', { query: { ...params } }).then((data) =>
      paginated<ActivityLog>(data, 'logs'),
    ),

  types: () => request<{ types: LogTypeCounts }>('logs/types').then((data) => data.types),

  get: (id: Id) => request<{ log: ActivityLog }>(`logs/${id}`).then((data) => data.log),
}
