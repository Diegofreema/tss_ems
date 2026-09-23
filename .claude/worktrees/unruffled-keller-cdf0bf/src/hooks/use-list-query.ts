import { parseAsInteger, parseAsString, useQueryState, useQueryStates } from 'nuqs'
import { useEffect, useMemo, useState } from 'react'

/** The design paginates every list at 8 rows. */
export const PAGE_SIZE = 8

/** How long the search box waits after the last keystroke before asking. */
const SETTLE_MS = 300

const asText = parseAsString.withDefault('')

/**
 * Search, filters and page live in the URL so a narrowed list is shareable and
 * survives a reload. Anything that changes what is being looked at resets to
 * page 1, as the design requires.
 *
 * `text` is what the box shows and `query` is what gets asked for: typing
 * moves the first immediately and the second once the typing stops, so a
 * search costs one request rather than one per keystroke.
 * */
export function useListQuery(filterKeys: readonly string[] = []) {
  const [query, setQueryState] = useQueryState('q', asText)
  const [page, setPageState] = useQueryState('page', parseAsInteger.withDefault(1))

  const parsers = useMemo(
    () => Object.fromEntries(filterKeys.map((key) => [key, asText])),
    [filterKeys],
  )
  const [filters, setFilters] = useQueryStates(parsers)

  const [text, setText] = useState(query)
  const [settled, setSettled] = useState(query)
  // The URL moved on its own — the back button, or a link into a search. The
  // box follows it; adjusting state during render, as React documents.
  if (query !== settled) {
    setSettled(query)
    setText(query)
  }

  useEffect(() => {
    if (text === query) return
    const timer = setTimeout(() => {
      void setQueryState(text || null)
      void setPageState(null)
    }, SETTLE_MS)
    return () => clearTimeout(timer)
  }, [text, query, setQueryState, setPageState])

  return {
    query,
    text,
    page,
    filters: filters as Record<string, string>,
    setQuery: setText,
    /**
     * A patch rather than one key, because a date range is a single control
     * over two query parameters and setting them one at a time would ask the
     * API twice for a range half of which is still the old one.
     *
     * `clears` names the filters scoped by these — an arm of the class just
     * left is not a filter anybody meant to keep.
     */
    setFilter: (values: Record<string, string>, clears: readonly string[] = []) => {
      const next: Record<string, string | null> = {}
      for (const [key, value] of Object.entries(values)) next[key] = value || null
      for (const dependent of clears) next[dependent] = null
      void setFilters(next)
      void setPageState(null)
    },
    setPage: (value: number) => void setPageState(value === 1 ? null : value),
    /**
     * Back to the whole list. Every filter at once rather than one control at
     * a time: a reader who wants the register back does not want to hunt for
     * which three things were narrowing it.
     */
    clear: () => {
      setText('')
      void setQueryState(null)
      void setFilters(Object.fromEntries(filterKeys.map((key) => [key, null])))
      void setPageState(null)
    },
  }
}

export type Paged<T> = {
  rows: T[]
  total: number
  from: number
  to: number
  isFirstPage: boolean
  isLastPage: boolean
}
