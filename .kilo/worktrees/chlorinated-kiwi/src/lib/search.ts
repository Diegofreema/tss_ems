/**
 * The search params a page keeps in its URL, declared for the router.
 *
 * Several pages hold their state in the query string and read it with nuqs,
 * which works off the raw location — so a route that never declared its params
 * still worked when you were on it. What it could not do is be linked to:
 * `<Link to="/teacher/submissions" search={{ assignment }}>` is checked against
 * the search the route declares, and a param the route never named is a type
 * error at every button that sends one. That is what failed the build.
 *
 * Values are handed back exactly as they arrived. The router parses the query
 * string as JSON, so a param may reach here as a number — `?arm=16` is written
 * that way on purpose in one place, because the quoted form reads back as no
 * arm at all — and coercing it here would change what the page sees.
 */
export function pageSearch<const K extends string>(keys: readonly K[]) {
  return (search: Record<string, unknown>): Partial<Record<K, string | number>> => {
    const kept: Partial<Record<K, string | number>> = {}
    for (const key of keys) {
      const value = search[key]
      if (typeof value === 'string' || typeof value === 'number') kept[key] = value
    }
    return kept
  }
}
