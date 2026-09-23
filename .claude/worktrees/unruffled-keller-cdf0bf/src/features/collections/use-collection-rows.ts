import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useListQuery } from '@/hooks/use-list-query'
import { collectionQuery } from './api'
import type { CollectionDef } from './types'

/**
 * One page of a collection, narrowed by the search box and the filters. Both
 * the paging and the narrowing happen wherever the rows come from — the server
 * for a live collection, `api.ts` for a fixture one — so this only reads the
 * answer.
 *
 * Deliberately not a suspending query. Every filter and every page turn changes
 * the query key, and a suspending one would throw the whole page — header,
 * search box, the dropdown still open under the cursor — back to its skeleton
 * each time. This keeps the last answer on screen (`placeholderData` on the
 * query itself) and reports `pending` while the next one is fetched, so only
 * the rows change. `paged` is undefined until the first answer arrives, which
 * is the one time there is nothing to keep showing.
 */
export function useCollectionRows(definition: CollectionDef) {
  const keys = useMemo(
    () =>
      definition.filters?.flatMap((filter) =>
        filter.until ? [filter.key, filter.until] : [filter.key],
      ) ?? [],
    [definition.filters],
  )
  const list = useListQuery(keys)
  const { query, filters } = list
  const { data, error, refetch, fetchStatus, isPlaceholderData, isFetching } = useQuery(
    collectionQuery(definition, { page: list.page, q: query, filters }),
  )
  const pagination = data?.pagination

  // The count beside the search reads "matches of all", and only an unnarrowed
  // answer knows what "all" is — so the last one is kept while a search or a
  // filter cuts the list down. A link straight into a narrowed list has never
  // seen one, and stays undefined rather than passing the matches off as the
  // whole register. Adjusting state during render, as React documents.
  // A filter that swaps the population has no whole to be a part of, so a
  // collection carrying one never claims a total.
  const swaps = definition.filters?.some((filter) => filter.replaces) ?? false
  // Something the reader set, which is what the clear control undoes. Not the
  // same as having no whole to count against: a collection that swaps its
  // population has none even before anybody touches a filter.
  const filtered = Boolean(query) || Object.values(filters).some(Boolean)
  const narrowed = swaps || filtered
  const [all, setAll] = useState<number | undefined>(
    narrowed ? undefined : pagination?.total,
  )
  // Not while the shown rows are last question's answer: the total belongs to
  // the list that is on screen, and that one has not been counted yet.
  if (!narrowed && !isPlaceholderData && pagination && all !== pagination.total) {
    setAll(pagination.total)
  }

  const start = pagination ? (pagination.page - 1) * pagination.limit : 0

  return {
    text: list.text,
    query,
    filters,
    page: list.page,
    /** The next set of rows is on its way; the ones on screen are the last set. */
    pending: isPlaceholderData || isFetching,
    /**
     * Why there are no rows, when the reason is a refusal rather than an empty
     * register — an endpoint the deployment is missing, or a session that has
     * ended. Only worth showing while there is nothing on screen to keep.
     */
    error,
    /**
     * react-query is holding the request back because it believes the browser
     * is offline. It will go on its own once the connection returns, but with
     * nothing on screen the reader is owed the reason rather than a skeleton
     * that never resolves.
     */
    paused: fetchStatus === 'paused',
    retry: () => void refetch(),
    /**
     * The figure the endpoint worked out over everything the filters match,
     * where it sends one. Undefined while the last answer is still on screen
     * and the next is being fetched, so the tile never reads as the total of
     * a range nobody is looking at any more.
     */
    tally: isPlaceholderData ? undefined : data?.tally,
    /** Whether the reader has set anything — a search or a filter. */
    filtered,
    setQuery: list.setQuery,
    setFilter: list.setFilter,
    clear: list.clear,
    setPage: list.setPage,
    total: all,
    paged:
      data && pagination
        ? {
            rows: data.items,
            total: pagination.total,
            from: pagination.total ? start + 1 : 0,
            to: start + data.items.length,
            isFirstPage: pagination.page <= 1,
            isLastPage: pagination.page >= pagination.pages,
          }
        : undefined,
  }
}
