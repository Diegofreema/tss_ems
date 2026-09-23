/** How many numbered buttons before the run is cut with an ellipsis. */
const WINDOW = 3

/**
 * The pages, as numbers rather than as Previous and Next.
 *
 * A register of forty pages is one somebody jumps around in — page 1 to check
 * the newest, the last page to check the oldest — and two arrows make that
 * thirty-nine clicks. The window is the first few pages, the page you are on,
 * and the last, with the gap between them shown as a gap.
 *
 * Pure, and tested, because the run it draws is a claim about how much there
 * is: a register of twelve rows that offers a page 6 is telling the reader the
 * school holds five times what it holds, and they find out by clicking.
 */
export function pageWindow(current: number, last: number): (number | 'gap')[] {
  const end = Math.max(1, Math.floor(last))
  if (end <= WINDOW + 2) {
    return Array.from({ length: end }, (_, index) => index + 1)
  }
  const out: (number | 'gap')[] = Array.from({ length: WINDOW }, (_, index) => index + 1)
  if (current > WINDOW && current < end) out.push('gap', current)
  else out.push('gap')
  out.push(end)
  return out
}
