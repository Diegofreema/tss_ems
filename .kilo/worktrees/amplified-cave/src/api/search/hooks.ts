import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { searchKeys } from './keys'
import { searchService } from './service'
import type { SearchParams } from './types'

/**
 * **On the query path on purpose** — the note in CLAUDE.md asks a plain
 * `useQuery` to justify itself, and this is one of the two shapes it already
 * allows: a searched feed that asks the school first.
 *
 * The reason is the one given there for `searchFrom`. This searches the whole
 * of three registers, across registration numbers, e-mails, usernames, middle
 * names and both guardians' phone numbers, with the words matched separately
 * — none of which the device could reproduce over the couple of hundred rows
 * it holds. When the office's search box is built, the fallback is the same
 * as the existing feeds': on a refusal, search what the device keeps and say
 * so, since that is narrower than the school's answer and must not pretend
 * otherwise.
 */

/** The shortest term the server will look anything up for. */
export const MIN_SEARCH_LENGTH = 2

/**
 * Idle until the term is long enough, so every keystroke of "Ob" before the
 * second one costs nothing.
 *
 * The previous answer stays on screen while the next is in flight — a list
 * that blanks between keystrokes reads as "no results" for as long as the
 * request takes, which on this connection is long enough to be believed.
 * Debouncing belongs to the box, not here; this hook takes the term it is
 * given.
 */
export function useSearch(params: SearchParams) {
  const term = params.q.trim()
  return useQuery({
    queryKey: searchKeys.results({ ...params, q: term }),
    queryFn: () => searchService.search({ ...params, q: term }),
    enabled: term.length >= MIN_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
  })
}
