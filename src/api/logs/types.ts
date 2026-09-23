import type { PageParams } from '../types.ts'

export type ActivityLog = {
  id: number
  title: string
  description: string
  timestamp: string
  type: LogType
  ip: string
  user_id: number | null
  /**
   * The author, twice over: `user` is their name and `username` their login.
   * Both are null once the account behind `user_id` has been deleted, which is
   * exactly when an audit entry matters most — so an entry is attributed to
   * whichever of the three the API still has.
   */
  user?: string | null
  username?: string | null
}

export type LogType = 'Add' | 'Edit' | 'Delete' | 'Login'

export type LogListParams = PageParams & {
  user_id?: number
  type?: LogType
  /** Matches the title, description or IP. */
  q?: string
  /** YYYY-MM-DD, both bounds inclusive. */
  from?: string
  to?: string
}

/** A count per type — enough to build a filter without pulling the log down. */
export type LogTypeCounts = Record<string, number>
