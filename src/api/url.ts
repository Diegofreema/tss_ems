import type { Paginated, Pagination } from './types.ts'

export type QueryValue = string | number | boolean | null | undefined

/**
 * Joins the base and the path and appends the query. An empty filter means
 * "no filter" to this API, so it is left off entirely rather than sent as
 * `?status=` — which the server would try to match against.
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, QueryValue>,
): string {
  const url = new URL(
    path.replace(/^\//, ''),
    baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
  )
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

/**
 * Every item a paged endpoint holds, or as many of them as `requests` covers.
 *
 * Page one says how many pages there are, so the rest go out together rather
 * than each waiting on the last. The register's own count comes back beside
 * the items because a caller that stopped short has to know it did — totalling
 * whatever happened to arrive is how a figure ends up quietly lower than the
 * list it claims to sum.
 */
export async function scanPages<TItem>(
  read: (page: number) => Promise<Paginated<TItem>>,
  requests: number,
): Promise<{ items: TItem[]; total: number }> {
  const first = await read(1)
  const after = Math.max(Math.min(first.pagination.pages, requests) - 1, 0)
  const rest = await Promise.all(
    Array.from({ length: after }, (_, index) => read(index + 2)),
  )
  return {
    items: [first, ...rest].flatMap((answer) => answer.items),
    total: first.pagination.total,
  }
}

/**
 * Narrows a list envelope to `{ items, pagination }`. `key` is the property
 * the endpoint puts its array under; endpoints that page nothing are given a
 * single page covering everything they returned.
 */
export function paginated<TItem>(
  data: Record<string, unknown>,
  key: string,
): Paginated<TItem> {
  const items = (data[key] ?? []) as TItem[]
  return {
    items,
    pagination: (data.pagination as Pagination | undefined) ?? {
      page: 1,
      limit: items.length,
      total: items.length,
      pages: 1,
    },
  }
}
