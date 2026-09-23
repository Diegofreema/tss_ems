import type { PageParams } from '../types.ts'

/**
 * A session (2025/2026) and a term share one shape and one set of endpoints;
 * only the path and the response key differ.
 */
export type CalendarRecord = {
  id: number
  name: string
  is_current: boolean
  user_id?: number
  /** The name of whoever opened it, already joined. Sessions only. */
  created_by?: string | null
  createdate?: string
  /** Detail only: how many rows are filed under it. */
  dependencies?: Record<string, number>
}

export type CalendarListParams = PageParams & {
  q?: string
}

export type CalendarList = {
  items: CalendarRecord[]
  pagination: { page: number; limit: number; total: number; pages: number }
  /** Returned alongside the session list so the current one can be marked. */
  currentId?: number
}

/** Names are trimmed and must be unique — a duplicate is a 422. */
export type CalendarBody = {
  name: string
}
