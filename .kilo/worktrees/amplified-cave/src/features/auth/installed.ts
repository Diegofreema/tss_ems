/**
 * Whether the portal is running as an installed app rather than in a browser
 * tab.
 *
 * Asked for one reason: an installed app opens on the sign-in form, and the
 * browser keeps the landing page. The manifest's `start_url` says so for every
 * install made from now on, but a phone that already has the app keeps the
 * `start_url` it was installed with — and that is most of the phones this will
 * ever run on. So the landing route asks this too.
 *
 * Two questions rather than one, because the platforms disagree.
 * `display-mode` is the standard and covers Android, desktop Chrome and
 * anything installed from a manifest; `navigator.standalone` is Safari's own,
 * non-standard and the only signal an iPhone gives for a page added to the
 * home screen. A school where half the staff are on iPhones is exactly where
 * checking only the first one looks like the feature never shipped.
 *
 * Every display mode but `browser` counts. The manifest asks for `standalone`
 * today, but `minimal-ui` and `fullscreen` are the same claim — a window with
 * no address bar to type a different URL into — and a manifest edited later
 * should not quietly turn this off.
 */
const APP_MODES = ['standalone', 'minimal-ui', 'fullscreen', 'window-controls-overlay'] as const

export function installedApp(): boolean {
  if (typeof window === 'undefined') return false

  // Safari's own, and it is a boolean on `navigator` rather than a media
  // query. Read defensively: it is absent everywhere else.
  const ios = (window.navigator as { standalone?: boolean }).standalone
  if (ios === true) return true

  return APP_MODES.some((mode) => {
    try {
      return window.matchMedia(`(display-mode: ${mode})`).matches
    } catch {
      // An engine that does not know the mode throws rather than answering
      // false. Not knowing is not a yes.
      return false
    }
  })
}
