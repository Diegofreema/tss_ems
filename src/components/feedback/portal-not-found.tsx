import type { PortalConfig } from '@/lib/portal'
import { NotFoundState } from './not-found-state'

/**
 * The portal's 404, as a route's *own* `notFoundComponent`.
 *
 * It has to be the route's own rather than an ancestor's. A `notFound()`
 * thrown from a loader is drawn by the nearest boundary route **in place of
 * that route's component** — so left to `/admin` it replaces the shell itself
 * and the 404 lands on a bare white page with no sidebar. Handled on the route
 * that threw it, the shell above stays up and the 404 renders in its outlet,
 * where every other page goes.
 *
 * A path that matched no route at all is the other case, and the portal route
 * keeps its own for that one: there the shell renders and the not-found is
 * already the outlet's content.
 */
export const portalNotFound = (config: PortalConfig) => () => (
  <NotFoundState links={config.notFoundLinks} audience={config.notFoundAudience} />
)
