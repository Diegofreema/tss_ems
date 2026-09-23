/**
 * How much of the inbox the list actually draws.
 *
 * The threads themselves are all on the device and stay that way —
 * `GET /conversations` sends the whole inbox whatever it is asked for, which
 * was measured on 2026-09-11 against `page`, `limit`, `offset`, `per_page`,
 * `size` and `take`: ten rows came back every time and the envelope carries no
 * pagination block at all. There is no page to ask for, so there is nothing to
 * fetch a page at a time.
 *
 * What can be paged is the drawing of them, and that is the half the reader
 * feels: a school with four hundred conversations was building four hundred
 * rows on every keystroke in the search box. So the list renders a window and
 * grows it as the foot of the list comes into view.
 *
 * When the endpoint learns to paginate, the place to change is the collection's
 * fetcher — with the caveat in CLAUDE.md that a fetcher handing back one page
 * would be handing back the complete state of the set, and deleting the rest of
 * the school's copy with it.
 */

/** Drawn before the reader has scrolled at all. Two or three screens' worth. */
export const FIRST_PAGE = 20

/** Added each time the foot of the list comes into view. */
export const NEXT_PAGE = 20

/** The slice to draw. Never more than there is. */
export function pageOf<T>(rows: readonly T[], shown: number): T[] {
  return rows.slice(0, Math.max(0, Math.min(shown, rows.length)))
}

/**
 * Whether anything is left to draw, which is what puts the sentinel on screen.
 *
 * This is also the clamp. A window is allowed to run past the end of the list —
 * the reader kept scrolling, the search narrowed under them — because `pageOf`
 * slices to what is there and this answers false, so an over-wide window costs
 * a number in a variable and nothing else.
 */
export function hasMore(total: number, shown: number): boolean {
  return shown < total
}

/**
 * The window needed to reach a given row, or the one already open if it is
 * wider.
 *
 * A thread opened from the URL — a reload, a shared link, the back button —
 * may sit far below the first page, and its row would then be missing from the
 * list while the conversation itself was open beside it. Growing to include it
 * costs nothing and keeps the two halves of the screen telling the same story.
 * `-1` is "not in this list at all", which a thread filtered out by the tabs
 * genuinely is.
 */
export function windowFor(index: number, shown: number): number {
  if (index < 0) return shown
  return Math.max(shown, index + 1)
}
