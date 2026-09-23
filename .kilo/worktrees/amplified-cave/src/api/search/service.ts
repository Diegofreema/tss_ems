import { request } from '../client'
import type { SearchParams, SearchResults } from './types'

/**
 * The office's one search box, across the three registers.
 *
 * Admin only, and privilege-aware inside that: `searched` on the answer says
 * which registers this caller was actually allowed to look in. Read off a
 * live, populated answer on 2026-09-09.
 */
export const searchService = {
  /**
   * `q` must be at least two characters. A shorter one is not an error — the
   * server answers 200 with empty lists and a sentence saying what to type —
   * but it is a request worth not making, so the hook holds it back.
   */
  search: (params: SearchParams) => request<SearchResults>('search', { query: { ...params } }),
}
