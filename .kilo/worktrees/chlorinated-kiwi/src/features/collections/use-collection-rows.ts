import { useLiveQuery } from '@tanstack/react-db'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { collectionError, refetchCollection } from '@/db/collection'
import type { OutboxOp } from '@/db/outbox'
import { outbox } from '@/db/store'
import { useListQuery } from '@/hooks/use-list-query'
import { collectionQuery, pageRows } from './api'
import type { CollectionDef } from './types'

/**
 * One page of a collection, narrowed by the search box and the filters. Both
 * the paging and the narrowing happen wherever the rows come from — the device
 * for a bound collection, the server for a live one, `api.ts` for a fixture
 * one — so this only reads the answer.
 *
 * Deliberately not a suspending query. Every filter and every page turn changes
 * the query key, and a suspending one would throw the whole page — header,
 * search box, the dropdown still open under the cursor — back to its skeleton
 * each time. This keeps the last answer on screen (`placeholderData` on the
 * query itself) and reports `pending` while the next one is fetched, so only
 * the rows change. `paged` is undefined until the first answer arrives, which
 * is the one time there is nothing to keep showing.
 *
 * A definition carrying `collection` takes the local-first path instead: the
 * rows are read off the device with a live query and never asked for over the
 * network here. Both paths run on every render with the unused one switched
 * off, because the number of hooks a render makes cannot depend on which kind
 * of definition it was handed.
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
  const local = definition.collection

  /*
   * Every set the binding reads is made ready here, not left to whatever else
   * happens to preload it. The register is gated below on its lookups being
   * ready, and a lookup nothing preloads — the guardians behind the students
   * register, the roles behind the staff one — left it sitting on its
   * skeleton. Fire and forget, like the shell's own preloads: a set that
   * refuses answers through the live query's own error state.
   */
  useEffect(() => {
    if (!local) return
    for (const set of [local.entities, local.lookup, local.alsoLookup]) {
      void set?.preload().catch(() => undefined)
    }
  }, [local])

  // Both live queries are declared unconditionally and disabled by handing
  // back nothing from the query callback, which is how `useLiveQuery` is
  // documented to switch off.
  const entities = useLiveQuery({
    query: (q) => (local ? q.from({ entity: local.entities }) : undefined),
  })
  const lookup = useLiveQuery({
    query: (q) => (local?.lookup ? q.from({ entity: local.lookup }) : undefined),
  })
  // The queue, for a register that shows what this device has written and the
  // school has not seen. Subscribed unconditionally — it is one subscription to
  // a set that is already in memory, and the number of hooks cannot vary.
  const alsoLookup = useLiveQuery({
    query: (q) => (local?.alsoLookup ? q.from({ entity: local.alsoLookup }) : undefined),
  })
  const queue = useLiveQuery({ query: (q) => q.from({ op: outbox() }) })

  const {
    data: fetched,
    error: fetchError,
    refetch,
    fetchStatus,
    isPlaceholderData,
    isFetching,
  } = useQuery({
    ...collectionQuery(definition, { page: list.page, q: query, filters }),
    enabled: !local,
  })

  /**
   * Everything the register holds, before the search box and the page cut it
   * down — which is also what the count beside the search measures against.
   *
   * The ordering is the binding's own; a collection is keyed and hands its
   * rows back in key order whatever order the endpoint sent them in.
   */
  const held = useMemo(() => {
    if (!local) return undefined
    const ops = (queue.data ?? []) as OutboxOp[]
    // The school's rows, with anything this device has queued about them
    // written over the top — a subject withdrawn, a session made current.
    const built = local.rows(
      entities.data ?? [],
      lookup.data ?? [],
      alsoLookup.data ?? [],
    )
    const synced = local.overlay ? local.overlay(built, ops) : built
    // What this device has written goes first: it is what the person who just
    // wrote it is looking for, and it is the row that has not landed yet.
    const waiting = local.queued?.(ops) ?? []
    return waiting.length > 0 ? [...waiting, ...synced] : synced
  }, [local, entities.data, lookup.data, alsoLookup.data, queue.data])

  // The dropdowns, where this register's are worked out on the rows. Applied
  // after the whole set is in hand, so `total` below is still the count of
  // everything and the search still reads "matches of all".
  const shown = useMemo(
    () => (held && local?.narrow ? local.narrow(held, filters) : held),
    [held, local, filters],
  )

  // Nothing is on screen until the collection has actually answered. An empty
  // set that is merely still syncing must not be drawn as an empty register.
  const localReady =
    entities.isReady &&
    (!local?.lookup || lookup.isReady) &&
    (!local?.alsoLookup || alsoLookup.isReady)
  const data = local
    ? shown && localReady
      ? pageRows(shown, { page: list.page, q: query, filters })
      : undefined
    : fetched
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
  if (!local && !narrowed && !isPlaceholderData && pagination && all !== pagination.total) {
    setAll(pagination.total)
  }

  const start = pagination ? (pagination.page - 1) * pagination.limit : 0

  return {
    text: list.text,
    query,
    filters,
    page: list.page,
    /** The next set of rows is on its way; the ones on screen are the last set. */
    pending: local ? !localReady : isPlaceholderData || isFetching,
    /**
     * Why there are no rows, when the reason is a refusal rather than an empty
     * register — an endpoint the deployment is missing, or a session that has
     * ended. Only worth showing while there is nothing on screen to keep.
     *
     * A bound collection refuses only when this device has never synced the set
     * at all: one that has kept a copy answers from it, connection or no
     * connection, and never reaches here.
     */
    error: local ? (entities.isError ? collectionError(local.entities.id) : undefined) : fetchError,
    /**
     * react-query is holding the request back because it believes the browser
     * is offline. It will go on its own once the connection returns, but with
     * nothing on screen the reader is owed the reason rather than a skeleton
     * that never resolves.
     *
     * Never true on the local-first path: there is no request to hold back,
     * which is the entire point of it.
     */
    paused: local ? false : fetchStatus === 'paused',
    retry: local
      ? () => void refetchCollection(local.entities.id)
      : () => void refetch(),
    /**
     * The figure the endpoint worked out over everything the filters match,
     * where it sends one. Undefined while the last answer is still on screen
     * and the next is being fetched, so the tile never reads as the total of
     * a range nobody is looking at any more.
     */
    tally: isPlaceholderData ? undefined : fetched?.tally,
    /** Whether the reader has set anything — a search or a filter. */
    filtered,
    setQuery: list.setQuery,
    setFilter: list.setFilter,
    clear: list.clear,
    setPage: list.setPage,
    /**
     * How many the register holds unnarrowed. Known outright on the local path
     * — the whole set is in hand — which is why the running total above is
     * only kept for the paged one.
     */
    /*
     * A register that swaps its population has no whole to be a part of, local
     * or not — the staff page holds the teaching records and the office ones in
     * one set and shows one of them — so it reports matches alone, exactly as
     * the paged path does.
     */
    total: local ? (swaps || !localReady ? undefined : held?.length) : all,
    paged:
      data && pagination
        ? {
            rows: data.items,
            total: pagination.total,
            pages: pagination.pages,
            from: pagination.total ? start + 1 : 0,
            to: start + data.items.length,
            isFirstPage: pagination.page <= 1,
            isLastPage: pagination.page >= pagination.pages,
          }
        : undefined,
  }
}
