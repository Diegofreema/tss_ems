/**
 * The design's buttons, as classes rather than a component: `Button` already
 * owns the pending spinner and the `asChild` link case, and wrapping it again
 * would mean re-declaring both.
 */

/**
 * Full width, the auth blue, and the same height as a field — which is
 * `--auth-control`, a clamp on the height of the screen rather than the
 * design's flat 46px. See `index.css`.
 */
export const authButton =
  'h-(--auth-control) w-full rounded-md bg-ui-blue text-base font-medium text-white hover:bg-ui-blue/90 focus-visible:ring-ui-blue/40'

/** The same shape for the second way out of a screen, where there is one. */
export const authButtonQuiet =
  'h-(--auth-control) w-full rounded-md border-ui-hint/40 bg-ui-paper text-base font-medium text-ui-ink hover:bg-ui-field'
