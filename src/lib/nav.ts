/**
 * Whether a nav path is a portal's own home — `/admin`, `/teacher`.
 *
 * It matters because a home is the prefix of every page in its portal, so the
 * router's default prefix matching leaves the Dashboard link lit on every
 * screen a user ever sees. Only the home is matched exactly; every other item
 * keeps prefix matching, which is what keeps a section lit while you are on a
 * record page inside it.
 *
 * Derived from the path rather than declared on each item, so a portal added
 * later cannot forget to say so.
 */
export function isPortalHome(to: string): boolean {
  return to.split('/').filter(Boolean).length === 1
}
