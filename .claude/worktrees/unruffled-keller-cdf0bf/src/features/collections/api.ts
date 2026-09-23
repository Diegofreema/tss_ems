import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { plainText } from './rich-text'
import type { CollectionDef, ListParams, ListResult, Row } from './types'

/** The design shows its loading skeleton for about this long on a navigation. */
const LATENCY_MS = 420

/**
 * Cells are matched on the words in them: a row carrying a rich-text body
 * would otherwise answer to "p", "strong" and every other tag it is written
 * with. Plain cells have no markup to take off, so they are unaffected.
 */
function matches(row: Row, needle: string) {
  return Object.entries(row).some(
    ([key, value]) => key !== 'id' && plainText(value).toLowerCase().includes(needle),
  )
}

/**
 * Searching and paging done here rather than by the API.
 *
 * For a list the endpoint hands back whole — the book catalogue answers with
 * every title and ignores `page` and `limit` — this is the only way the page
 * gets pagination at all, and it searches every column the row carries rather
 * than the one field a query parameter would narrow.
 */
export function pageRows(all: Row[], { page, q }: ListParams): ListResult {
  const needle = q.trim().toLowerCase()
  const found = needle ? all.filter((row) => matches(row, needle)) : all
  const start = (page - 1) * PAGE_SIZE

  return {
    items: found.slice(start, start + PAGE_SIZE),
    pagination: {
      page,
      limit: PAGE_SIZE,
      total: found.length,
      pages: Math.max(1, Math.ceil(found.length / PAGE_SIZE)),
    },
  }
}

/**
 * The rows written into the definition, searched and paged so that a fixture
 * list and a live one hand back exactly the same shape.
 */
async function fixtureRows(
  definition: CollectionDef,
  params: ListParams,
): Promise<ListResult> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))
  return pageRows(definition.rows ?? [], params)
}

/**
 * A list the API cannot answer for. The page still loads, pages and reports
 * itself empty, so its empty state can explain what is missing rather than the
 * route showing rows nobody counted.
 */
export const emptySource = async (): Promise<ListResult> => ({
  items: [],
  pagination: { page: 1, limit: PAGE_SIZE, total: 0, pages: 1 },
})

/** Keyed on the list path — unique across portals — plus any row scope. */
export const collectionQuery = (definition: CollectionDef, params: ListParams) =>
  queryOptions({
    queryKey: ['collection', definition.path, definition.scope ?? '', params],
    queryFn: () =>
      definition.source?.(params) ?? fixtureRows(definition, params),
    // Turning a page keeps the rows on screen rather than dropping the whole
    // list back to the skeleton for one request.
    placeholderData: keepPreviousData,
  })
